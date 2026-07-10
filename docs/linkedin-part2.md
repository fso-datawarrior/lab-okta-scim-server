# Identity Lab | Part 2: The Full Lifecycle

*Published on LinkedIn by Jamie Ruth -- July 2026*
*[View on LinkedIn](#)* *(link to be updated after posting)*

---

I just proved the full identity lifecycle, end to end, on infrastructure I built myself.

Part 1 was the build: a company directory connected to an AI platform, with every action logged. This is what happened next.

## What I did

- Changed a job title in the Okta admin console for a test user (Grace Test, now "AI Platform Analyst")
- Watched Okta read the current user record from my SCIM server (GET), merge the change, and write the full profile back (PUT) -- all within 164 milliseconds
- Confirmed the update landed in the audit trail with the same actor fingerprint as every previous operation
- Combined this with the provision (POST 201) and deprovision (PATCH, active set to false) tests from Part 1

Three operations. One actor fingerprint across all of them. Every call logged.

## The moment that taught me the most

I expected Okta to send a PATCH for a single field change. Instead, it did a full read-modify-write. GET the entire user, merge the new title into the existing record, PUT the whole thing back. That pattern matters because it means the SCIM server always receives the complete user state, not a fragment. If you are debugging a sync issue in production, you can diff any two consecutive PUTs and see exactly what changed. The audit trail becomes a timeline of the user's identity, not just a log of API calls.

## Why this matters beyond the lab

This is the joiner-mover-leaver story that every enterprise identity team lives with. Someone joins (provision). They change roles or titles (update). They leave or lose access (deprovision). If any of those three breaks silently, you get orphaned accounts, stale permissions, or access that should have been revoked and was not.

Building all three against a real directory, with a real audit trail, means the failure modes are not theoretical. I have seen what happens when the token is misconfigured. I have seen the timing of deprovisioning (27 seconds from group removal to revocation). I have seen how update payloads actually look, which is different from what the SCIM RFC implies.

## The end goal

An AI platform where every user, every permission, and every action is traceable from the directory to the model. Identity is the control plane. The audit trail is the proof.

## Down the road

- An MCP server that lets an AI assistant provision and deprovision users itself, with human approval on anything destructive and an audit line on every action
- Single sign-on wired end to end into a live application
- The same lifecycle repeated on Microsoft Entra ID

That is what is next.

---

*#EnterpriseAI #IdentityManagement #Okta #SCIM #AIAdoption #IAM*
