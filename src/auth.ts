import type { NextFunction, Request, Response } from "express";
import { tokenFingerprint } from "./audit.js";
import { sendScimError } from "./scim.js";

declare global {
  namespace Express {
    interface Request {
      scimActor?: string;
    }
  }
}

export function bearerAuth(expectedToken: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.get("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    const presented = match?.[1]?.trim();

    if (!presented || presented !== expectedToken) {
      req.scimActor = tokenFingerprint(presented);
      sendScimError(res, 401, "Unauthorized: valid Bearer token required");
      return;
    }

    req.scimActor = tokenFingerprint(presented);
    next();
  };
}