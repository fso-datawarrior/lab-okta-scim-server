import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "..", "logs");
const LOG_FILE = join(LOG_DIR, "audit.jsonl");

export function tokenFingerprint(token: string | undefined): string {
  if (!token) return "none";
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

export interface AuditEntry {
  timestamp: string;
  method: string;
  path: string;
  actor: string;
  request: Record<string, unknown>;
  status: number;
}

export function writeAudit(entry: AuditEntry): void {
  mkdirSync(LOG_DIR, { recursive: true });
  const line = JSON.stringify(entry);
  appendFileSync(LOG_FILE, line + "\n", "utf8");
  console.log(`[audit] ${line}`);
}

export function summarizeRequest(
  method: string,
  path: string,
  body: unknown,
  query: Record<string, unknown>,
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  if (Object.keys(query).length > 0) {
    summary.query = query;
  }
  if (body && typeof body === "object" && Object.keys(body as object).length > 0) {
    const b = body as Record<string, unknown>;
    if (method === "POST" || method === "PUT") {
      summary.userName = b.userName;
      summary.displayName = b.displayName;
      summary.active = b.active;
      summary.externalId = b.externalId;
      if (Array.isArray(b.members)) {
        summary.memberCount = b.members.length;
      }
    }
    if (method === "PATCH" && Array.isArray(b.Operations)) {
      summary.operations = (b.Operations as Array<{ op?: string; path?: string }>).map(
        (op) => ({
          op: op.op,
          path: op.path,
        }),
      );
    }
  }
  summary.path = path;
  return summary;
}