import type { Request, Response } from "express";
import type { ScimError, ScimListResponse } from "./types.js";

export const SCIM_CONTENT_TYPE = "application/scim+json";
export const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
export const GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
export const LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
export const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";
export const PATCH_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:PatchOp";

export function sendScim(res: Response, status: number, body: unknown): void {
  res.status(status).type(SCIM_CONTENT_TYPE).json(body);
}

export function sendScimError(
  res: Response,
  status: number,
  detail: string,
  scimType?: string,
): void {
  const err: ScimError = {
    schemas: [ERROR_SCHEMA],
    status: String(status),
    detail,
  };
  if (scimType) err.scimType = scimType;
  sendScim(res, status, err);
}

export function listResponse<T>(
  resources: T[],
  startIndex: number,
  count: number,
): ScimListResponse<T> {
  const totalResults = resources.length;
  const start = Math.max(1, startIndex);
  const pageSize = Math.max(0, count);
  const sliced =
    pageSize === 0 ? [] : resources.slice(start - 1, start - 1 + pageSize);

  return {
    schemas: [LIST_SCHEMA],
    totalResults,
    startIndex: start,
    itemsPerPage: sliced.length,
    Resources: sliced,
  };
}

/** Parse `attr eq "value"` filters used by Okta. */
export function parseEqFilter(
  filter: string | undefined,
  attr: string,
): string | undefined {
  if (!filter) return undefined;
  const re = new RegExp(
    `^\\s*${attr}\\s+eq\\s+"([^"]*)"\\s*$`,
    "i",
  );
  const m = filter.match(re);
  return m?.[1];
}

export function pagination(req: Request): { startIndex: number; count: number } {
  const startIndex = Math.max(1, parseInt(String(req.query.startIndex ?? "1"), 10) || 1);
  const count = Math.max(0, parseInt(String(req.query.count ?? "100"), 10) || 100);
  return { startIndex, count };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function resourceLocation(baseUrl: string, type: "Users" | "Groups", id: string): string {
  return `${baseUrl}/scim/v2/${type}/${id}`;
}

export function baseUrlFromReq(req: Request): string {
  const proto = (req.get("x-forwarded-proto") ?? req.protocol).split(",")[0].trim();
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}