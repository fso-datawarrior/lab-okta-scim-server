# Identity Lab | Part 3: The Full Picture

*Published on LinkedIn by Jamie Ruth -- July 2026*
*[View on LinkedIn](#)* *(link to be updated after posting)*

---

I built an identity system from scratch. Here is what it does and why it matters.

This is the summary of a two-part build where I connected a company directory (Okta) to an AI platform, proved the full user lifecycle, and logged everything.

## The problem this solves

When a company rolls out an AI tool, someone has to answer four questions: How fast can new people get access? Does their profile stay current when they change roles? How fast is access revoked when they leave? And can you prove any of it to an auditor?

Most organizations answer those questions with manual processes, tickets, and spreadsheets. This build answers them with working software and a structured audit trail.

## What I built

A SCIM 2.0 server in TypeScript, connected to Okta through a secure Cloudflare tunnel, with bearer-token authentication and an append-only audit log that records every operation.

## What I proved

The full joiner-mover-leaver lifecycle, tested against a live Okta directory:

- Someone joins: add them to a group, account created in seconds (POST 201)
- Their role changes: update in the directory, profile syncs in 164ms (GET + PUT)
- They leave: remove from group, access revoked in 27 seconds (PATCH active=false)

One actor fingerprint across all three operations. Every call logged.

## What I learned

Okta does not send a PATCH for profile updates. It does a full read-modify-write: GET the record, merge the change, PUT it back. That means the audit trail contains complete snapshots you can diff. The audit log also diagnosed a connection failure faster than Okta's own admin console.

## What comes next

An MCP server that lets an AI assistant handle provisioning with human approval on anything destructive. Single sign-on wired end to end. The same lifecycle on Microsoft Entra ID.

The full source code, technical documentation, and architecture diagrams are available in this repository.

---

*#EnterpriseAI #IdentityManagement #Okta #SCIM #AIAdoption #IAM #OpenSource*
