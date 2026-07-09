import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import type { Store } from "../store.js";
import {
  USER_SCHEMA,
  baseUrlFromReq,
  listResponse,
  nowIso,
  pagination,
  parseEqFilter,
  resourceLocation,
  sendScim,
  sendScimError,
} from "../scim.js";
import type { ScimEmail, ScimName, ScimPatchRequest, ScimUser } from "../types.js";

function buildUser(
  id: string,
  body: Partial<ScimUser>,
  baseUrl: string,
  existing?: ScimUser,
): ScimUser {
  const created = existing?.meta.created ?? nowIso();
  const lastModified = nowIso();
  return {
    schemas: [USER_SCHEMA],
    id,
    externalId: body.externalId ?? existing?.externalId,
    userName: body.userName ?? existing!.userName,
    name: (body.name as ScimName | undefined) ?? existing?.name,
    displayName: body.displayName ?? existing?.displayName,
    emails: (body.emails as ScimEmail[] | undefined) ?? existing?.emails,
    active: body.active !== undefined ? Boolean(body.active) : (existing?.active ?? true),
    meta: {
      resourceType: "User",
      created,
      lastModified,
      location: resourceLocation(baseUrl, "Users", id),
    },
  };
}

function applyUserPatch(user: ScimUser, patch: ScimPatchRequest, baseUrl: string): ScimUser {
  const next: ScimUser = {
    ...user,
    name: user.name ? { ...user.name } : undefined,
    emails: user.emails ? [...user.emails] : undefined,
    meta: { ...user.meta },
  };

  for (const op of patch.Operations ?? []) {
    const opName = (op.op ?? "").toLowerCase();
    const path = (op.path ?? "").toLowerCase();

    if (opName === "replace") {
      if (!op.path) {
        const value = op.value as Partial<ScimUser>;
        if (value.active !== undefined) next.active = Boolean(value.active);
        if (value.userName !== undefined) next.userName = String(value.userName);
        if (value.displayName !== undefined) next.displayName = String(value.displayName);
        if (value.externalId !== undefined) next.externalId = String(value.externalId);
        if (value.name !== undefined) next.name = value.name as ScimName;
        if (value.emails !== undefined) next.emails = value.emails as ScimEmail[];
      } else if (path === "active") {
        next.active = Boolean(op.value);
      } else if (path === "username") {
        next.userName = String(op.value);
      } else if (path === "displayname") {
        next.displayName = String(op.value);
      } else if (path === "externalid") {
        next.externalId = String(op.value);
      } else if (path === "name.givenname" && next.name) {
        next.name.givenName = String(op.value);
      } else if (path === "name.familyname" && next.name) {
        next.name.familyName = String(op.value);
      } else if (typeof op.value === "object" && op.value !== null) {
        const value = op.value as Record<string, unknown>;
        if ("active" in value) next.active = Boolean(value.active);
      }
    } else if (opName === "add") {
      if (path === "active" || (!op.path && typeof op.value === "object")) {
        const value = !op.path
          ? (op.value as Record<string, unknown>)
          : { active: op.value };
        if ("active" in value) next.active = Boolean(value.active);
      }
    }
  }

  next.meta.lastModified = nowIso();
  next.meta.location = resourceLocation(baseUrl, "Users", next.id);
  return next;
}

export function usersRouter(store: Store): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const { startIndex, count } = pagination(req);
    const userNameEq = parseEqFilter(
      typeof req.query.filter === "string" ? req.query.filter : undefined,
      "userName",
    );

    let users = [...store.users.values()];
    if (userNameEq !== undefined) {
      users = users.filter(
        (u) => u.userName.toLowerCase() === userNameEq.toLowerCase(),
      );
    }

    sendScim(res, 200, listResponse(users, startIndex, count));
  });

  router.post("/", (req, res) => {
    const body = req.body as Partial<ScimUser>;
    if (!body.userName) {
      sendScimError(res, 400, "userName is required", "invalidValue");
      return;
    }
    if (store.findUserByUserName(body.userName)) {
      sendScimError(res, 409, `User ${body.userName} already exists`, "uniqueness");
      return;
    }

    const id = uuidv4();
    const baseUrl = baseUrlFromReq(req);
    const user = buildUser(id, body, baseUrl);
    store.users.set(id, user);
    sendScim(res, 201, user);
  });

  router.get("/:id", (req, res) => {
    const user = store.users.get(req.params.id);
    if (!user) {
      sendScimError(res, 404, `Resource ${req.params.id} not found`, "noTarget");
      return;
    }
    sendScim(res, 200, user);
  });

  router.put("/:id", (req, res) => {
    const existing = store.users.get(req.params.id);
    if (!existing) {
      sendScimError(res, 404, `Resource ${req.params.id} not found`, "noTarget");
      return;
    }

    const body = req.body as Partial<ScimUser>;
    if (!body.userName) {
      sendScimError(res, 400, "userName is required", "invalidValue");
      return;
    }

    const conflict = store.findUserByUserName(body.userName);
    if (conflict && conflict.id !== existing.id) {
      sendScimError(res, 409, `User ${body.userName} already exists`, "uniqueness");
      return;
    }

    const baseUrl = baseUrlFromReq(req);
    const user = buildUser(existing.id, body, baseUrl, existing);
    store.users.set(existing.id, user);
    sendScim(res, 200, user);
  });

  router.patch("/:id", (req, res) => {
    const existing = store.users.get(req.params.id);
    if (!existing) {
      sendScimError(res, 404, `Resource ${req.params.id} not found`, "noTarget");
      return;
    }

    const baseUrl = baseUrlFromReq(req);
    const patched = applyUserPatch(existing, req.body as ScimPatchRequest, baseUrl);
    store.users.set(existing.id, patched);
    sendScim(res, 200, patched);
  });

  return router;
}