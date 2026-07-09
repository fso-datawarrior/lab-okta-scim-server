import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import type { Store } from "../store.js";
import {
  GROUP_SCHEMA,
  baseUrlFromReq,
  listResponse,
  nowIso,
  pagination,
  parseEqFilter,
  resourceLocation,
  sendScim,
  sendScimError,
} from "../scim.js";
import type { ScimGroup, ScimGroupMember, ScimPatchRequest } from "../types.js";

function normalizeMembers(members: unknown, baseUrl: string): ScimGroupMember[] {
  if (!Array.isArray(members)) return [];
  return members.map((m) => {
    const member = m as ScimGroupMember;
    return {
      value: member.value,
      display: member.display,
      $ref: member.$ref ?? resourceLocation(baseUrl, "Users", member.value),
    };
  });
}

function buildGroup(
  id: string,
  body: Partial<ScimGroup>,
  baseUrl: string,
  existing?: ScimGroup,
): ScimGroup {
  const created = existing?.meta.created ?? nowIso();
  return {
    schemas: [GROUP_SCHEMA],
    id,
    displayName: body.displayName ?? existing!.displayName,
    members: body.members !== undefined
      ? normalizeMembers(body.members, baseUrl)
      : (existing?.members ?? []),
    meta: {
      resourceType: "Group",
      created,
      lastModified: nowIso(),
      location: resourceLocation(baseUrl, "Groups", id),
    },
  };
}

function memberFilterValue(path: string | undefined): string | undefined {
  if (!path) return undefined;
  const m = path.match(/members\s*\[\s*value\s+eq\s+"([^"]+)"\s*\]/i);
  return m?.[1];
}

function applyGroupPatch(group: ScimGroup, patch: ScimPatchRequest, baseUrl: string): ScimGroup {
  const next: ScimGroup = {
    ...group,
    members: [...group.members],
    meta: { ...group.meta },
  };

  for (const op of patch.Operations ?? []) {
    const opName = (op.op ?? "").toLowerCase();
    const path = op.path ?? "";
    const pathLower = path.toLowerCase();

    if (opName === "add" && (pathLower === "members" || pathLower.startsWith("members"))) {
      const toAdd = normalizeMembers(
        Array.isArray(op.value) ? op.value : [op.value],
        baseUrl,
      );
      for (const member of toAdd) {
        if (!next.members.some((m) => m.value === member.value)) {
          next.members.push(member);
        }
      }
    } else if (opName === "remove") {
      const filterValue = memberFilterValue(path);
      if (filterValue) {
        next.members = next.members.filter((m) => m.value !== filterValue);
      } else if (pathLower === "members") {
        const values = Array.isArray(op.value)
          ? (op.value as ScimGroupMember[]).map((m) => m.value)
          : op.value
            ? [(op.value as ScimGroupMember).value]
            : [];
        next.members = next.members.filter((m) => !values.includes(m.value));
      }
    } else if (opName === "replace") {
      if (pathLower === "members" || (!op.path && op.value && typeof op.value === "object")) {
        if (pathLower === "members") {
          next.members = normalizeMembers(op.value, baseUrl);
        } else {
          const value = op.value as Partial<ScimGroup>;
          if (value.displayName !== undefined) next.displayName = String(value.displayName);
          if (value.members !== undefined) {
            next.members = normalizeMembers(value.members, baseUrl);
          }
        }
      } else if (pathLower === "displayname") {
        next.displayName = String(op.value);
      }
    }
  }

  next.meta.lastModified = nowIso();
  next.meta.location = resourceLocation(baseUrl, "Groups", next.id);
  return next;
}

export function groupsRouter(store: Store): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const { startIndex, count } = pagination(req);
    const displayNameEq = parseEqFilter(
      typeof req.query.filter === "string" ? req.query.filter : undefined,
      "displayName",
    );

    let groups = [...store.groups.values()];
    if (displayNameEq !== undefined) {
      groups = groups.filter(
        (g) => g.displayName.toLowerCase() === displayNameEq.toLowerCase(),
      );
    }

    sendScim(res, 200, listResponse(groups, startIndex, count));
  });

  router.post("/", (req, res) => {
    const body = req.body as Partial<ScimGroup>;
    if (!body.displayName) {
      sendScimError(res, 400, "displayName is required", "invalidValue");
      return;
    }
    if (store.findGroupByDisplayName(body.displayName)) {
      sendScimError(res, 409, `Group ${body.displayName} already exists`, "uniqueness");
      return;
    }

    const id = uuidv4();
    const baseUrl = baseUrlFromReq(req);
    const group = buildGroup(id, body, baseUrl);
    store.groups.set(id, group);
    sendScim(res, 201, group);
  });

  router.get("/:id", (req, res) => {
    const group = store.groups.get(req.params.id);
    if (!group) {
      sendScimError(res, 404, `Resource ${req.params.id} not found`, "noTarget");
      return;
    }
    sendScim(res, 200, group);
  });

  router.patch("/:id", (req, res) => {
    const existing = store.groups.get(req.params.id);
    if (!existing) {
      sendScimError(res, 404, `Resource ${req.params.id} not found`, "noTarget");
      return;
    }

    const baseUrl = baseUrlFromReq(req);
    const patched = applyGroupPatch(existing, req.body as ScimPatchRequest, baseUrl);
    store.groups.set(existing.id, patched);
    sendScim(res, 200, patched);
  });

  return router;
}