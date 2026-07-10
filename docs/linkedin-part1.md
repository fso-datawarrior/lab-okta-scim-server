# Identity Lab | Part 1: The Build

*Published on LinkedIn by Jamie Ruth -- July 2026*
*[View on LinkedIn](https://www.linkedin.com/posts/jamie-ruth_enterpriseai-identitymanagement-okta-share-7481115038200823808-_Tpd)*

---

I gave an entire team access to an AI platform with zero help-desk tickets. Then I shut one person's access off in 27 seconds, with the receipt to prove it.

That was this week's build. All of it a demonstration lab, all of it real, working software.

## What I did

I set up a company directory (Okta, the same product large enterprises run) and connected it to a stand-in AI platform I built myself. The directory now controls the platform's user list automatically:

- Add someone to the right team, and their account exists within seconds. No ticket, no waiting.
- Remove them, and their access shuts off in under 30 seconds. Not weeks. Not "probably."
- Every change, and even every failed connection attempt, lands in a tamper-evident log.

## The best moment was a failure

The connection refused to authenticate three times in a row, and the log I had built beforehand found the cause in one look, in about two minutes. Record-keeping first isn't bureaucracy. It's how you debug.

## What I'm exploring

How companies roll out AI tools without losing control of them. Everyone talks about which AI platform to pick. Almost nobody talks about the plumbing underneath: who gets access, at what level, how fast it can be taken away, and whether you can prove any of it later. That layer decides whether a rollout earns trust or becomes the security team's problem.

## The end goal

AI adoption where trust is built in, not bolted on. The right people productive on day one, access that is provably correct at all times, and answers for any auditor question that come from a record instead of somebody's memory.

## Down the road

- Single sign-on wired end to end into one of my own apps
- The same build repeated on Microsoft's directory (Entra ID)
- The one I'm most excited about: AI assistants doing this admin work themselves, with human approval on anything destructive and an audit line on every action. That's the next post.

If AI doing real operations work, with real guardrails, is your kind of thing, follow along.

---

*#EnterpriseAI #IdentityManagement #Okta #AIAdoption #IAM*
