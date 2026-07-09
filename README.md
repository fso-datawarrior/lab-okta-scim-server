# lab-okta-scim-server (Demonstration)

Minimal **SCIM 2.0** server for an Okta provisioning lab. In-memory only — not for production.

Implements the User/Group endpoints Okta exercises under `/scim/v2`, bearer auth, and a JSONL audit trail (`logs/audit.jsonl`) so you can see every provisioning call.

## Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/)

## Setup

```bash
cd C:\GH_Repositories\lab-okta-scim-server
cp .env.example .env
# Edit .env — set a long random SCIM_BEARER_TOKEN
pnpm install
```

## Run

```bash
pnpm dev
```

Listens on **http://localhost:3000** (or `PORT` from `.env`).

SCIM base path: `http://localhost:3000/scim/v2`

## Tests

```bash
pnpm test
```

## Expose HTTPS for Okta

Okta requires an HTTPS SCIM base URL. Tunnel localhost with either:

**Cloudflare Tunnel**

```bash
cloudflared tunnel --url http://localhost:3000
```

**ngrok**

```bash
ngrok http 3000
```

Copy the HTTPS URL the tunnel prints (e.g. `https://abc123.trycloudflare.com` or `https://xyz.ngrok-free.app`).

## Okta Admin Console — private SCIM integration

When adding a **private SCIM** / custom app with provisioning:

| Field | Value |
| --- | --- |
| SCIM connector base URL | `<tunnel-url>/scim/v2` |
| Unique identifier field for users | `userName` |
| Authentication mode | HTTP Header |
| Authorization | Bearer `<your SCIM_BEARER_TOKEN from .env>` |

Example base URL: `https://abc123.trycloudflare.com/scim/v2`

Enable **Create Users**, **Update User Attributes**, and **Deactivate Users** as needed for the lab. Group push uses the same base URL’s `/Groups` endpoints.

## Quick curl check

```bash
export TOKEN="$(grep SCIM_BEARER_TOKEN .env | cut -d= -f2-)"

# Create
curl -s -X POST "http://localhost:3000/scim/v2/Users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/scim+json" \
  -d '{"schemas":["urn:ietf:params:scim:schemas:core:2.0:User"],"userName":"lab.user@example.com","active":true}'

# Filter
curl -sG "http://localhost:3000/scim/v2/Users" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode 'filter=userName eq "lab.user@example.com"'

# Deactivate (replace USER_ID)
curl -s -X PATCH "http://localhost:3000/scim/v2/Users/USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/scim+json" \
  -d '{"schemas":["urn:ietf:params:scim:api:messages:2.0:PatchOp"],"Operations":[{"op":"replace","path":"active","value":false}]}'
```

Then inspect the why-trail:

```bash
cat logs/audit.jsonl
```

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/scim/v2/ServiceProviderConfig` | Advertises PATCH + bearer auth |
| GET/POST | `/scim/v2/Users` | Filter `userName eq "..."`, pagination |
| GET/PUT/PATCH | `/scim/v2/Users/:id` | PATCH `active=false` for deprovision |
| GET/POST | `/scim/v2/Groups` | Filter `displayName eq "..."` |
| GET/PATCH | `/scim/v2/Groups/:id` | add/remove/replace members |

All `/scim/v2/*` routes require `Authorization: Bearer <token>`.

## Audit trail

Each SCIM request appends one JSON line to `logs/audit.jsonl` (and mirrors to the console) with timestamp, method, path, actor (SHA-256 fingerprint of the token, not the raw secret), request summary, and HTTP status.