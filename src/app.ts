import express, { type Express, type Request, type Response } from "express";
import { summarizeRequest, tokenFingerprint, writeAudit } from "./audit.js";
import { bearerAuth } from "./auth.js";
import { sendScim } from "./scim.js";
import { Store } from "./store.js";
import { groupsRouter } from "./routes/groups.js";
import { usersRouter } from "./routes/users.js";

export interface AppOptions {
  bearerToken: string;
  store?: Store;
}

export function createApp(options: AppOptions): { app: Express; store: Store } {
  const store = options.store ?? new Store();
  const app = express();

  app.use(express.json({ type: ["application/json", "application/scim+json"] }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, label: "Demonstration" });
  });

  const scim = express.Router();

  // Register audit listener before auth so 401s are still recorded.
  scim.use((req: Request, res: Response, next) => {
    const header = req.get("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    const presented = match?.[1]?.trim();
    req.scimActor = tokenFingerprint(presented);

    res.on("finish", () => {
      writeAudit({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        actor: req.scimActor ?? "none",
        request: summarizeRequest(
          req.method,
          req.path,
          req.body,
          req.query as Record<string, unknown>,
        ),
        status: res.statusCode,
      });
    });
    next();
  });

  scim.use(bearerAuth(options.bearerToken));

  scim.get("/ServiceProviderConfig", (_req, res) => {
    sendScim(res, 200, {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
      documentationUri: "https://datatracker.ietf.org/doc/html/rfc7644",
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: "oauthbearertoken",
          name: "OAuth Bearer Token",
          description: "Authentication via Authorization: Bearer <token>",
          specUri: "https://www.rfc-editor.org/rfc/rfc6750",
          primary: true,
        },
      ],
      meta: {
        resourceType: "ServiceProviderConfig",
        location: "/scim/v2/ServiceProviderConfig",
      },
    });
  });

  scim.use("/Users", usersRouter(store));
  scim.use("/Groups", groupsRouter(store));

  app.use("/scim/v2", scim);

  return { app, store };
}