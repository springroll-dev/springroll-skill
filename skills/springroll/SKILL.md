---
name: springroll
description: Deploy the current project to SpringRoll, The Control Plane and App Portal for AI-built Applications. Use when the user asks to deploy, publish, ship, or register this project with SpringRoll, or to move a SpringRoll release from development to UAT or production. Requires the SpringRoll MCP server to be connected.
---

# Deploy to SpringRoll

**The Control Plane and App Portal for AI-built Applications**

Deploy AI-built applications safely, connect them to approved company data, and make them available to the right people.

Think OpenRouter for deployment, with governance and an App Portal around it. SpringRoll currently deploys to managed Vercel and Cloudflare.

SpringRoll is where an internal app stops being a loose artifact and becomes a
governed service: it gets an owner, a stage, a per-environment deployment, an audit
trail, and an audience. You publish into it over MCP.

Your job is to follow the application's configured Deployment workflow, hand the
user a link, and report the resulting environment honestly. **Direct** applications
deploy to Production; **Staged** applications start in Development and require a
human-approved promotion before Production.

**You do not decide whether this project needs git.** No tool asks you to declare a
source type. Send what you have; SpringRoll derives the rest. (A manifest has an
optional `spec.source.type`, but it is advisory: SpringRoll derives the real value
from whether a repository is present and warns if the manifest disagrees.)

## The tool surface

Fifteen tools, and that is the whole of it. Server version `0.2.0` removed the older
names outright rather than aliasing them, so a client pinned to a retired name fails
loudly instead of drifting.

| Tool | For |
|---|---|
| `springroll.context` | Who you are, what you may do, whether a runtime can serve |
| `springroll.deploy` | Register if new, attach source, build, return the URL |
| `springroll.deploy.status` | Poll a build; optionally read its logs |
| `springroll.deploy.promote` | Move an already-built release to another environment |
| `springroll.placement.preview` | Score placement and cost without deploying |
| `springroll.app.get` | One application's record, status, and provenance |
| `springroll.app.list` | The catalog this token can see |
| `springroll.app.update` | Repair metadata on an existing application |
| `springroll.approval.submit` | Ask a human to decide something |
| `springroll.approval.get` | Poll whether they decided it |
| `springroll.policy.check` | Why a gate is closed, or validate a manifest |
| `springroll.connect.data_products` | What approved company data exists |
| `springroll.connect.request_access` | Ask a data owner for a scope |
| `springroll.connect.access_status` | Where that request got to |
| `springroll.app.record_prompts` | Attach the conversation that built it |

## When not to use this

- No SpringRoll MCP server is connected: the `springroll.*` tools are absent.
  Say so and point at Settings → Coding agents in SpringRoll for the connect
  command. Do not try to work around it with the REST API.
- The project is not a deployable web app (a library, a CLI, a notebook). SpringRoll
  deploys web applications; say so rather than registering something that can never
  build.
- The user wants to *approve* something. You cannot. Only a person may decide an
  approval request, and no tool exists for it.

## 1. Find out who you are

Call `springroll.context` **first**, before anything else. It takes no parameters and
returns the organization, the identity the token acts as, the permissions it holds,
and the part most worth reading: a `runtime` block.

**If `runtime.ok` is false, stop and tell the user before doing anything else.** No
runtime in this organization can serve a deployment, so `springroll.deploy` will
refuse rather than leave a half-registered application pointing at nothing. Read
`runtime.errors` for the reason. The fix is a tenant admin adding a runtime, or the
platform setting `VERCEL_TOKEN`; it is not something you can work around.

`runtime.ok` is resolved without verifying credentials, so a true here means a
runtime was found, not that its token still works. `springroll.deploy` verifies for
real before it writes anything, which is why a deploy can still refuse after a clean
context.

`runtime.configured` is worth reading too. When it is false the organization is
deploying on the SpringRoll-managed account: development works, and the production
gate will still hold until a runtime is configured for the organization itself.
`runtimesAvailableInThisBuild` lists the providers this deployment of SpringRoll can
drive at all.

Stop here and tell the user if the context shows no `app:create`. Their agent can
read the catalog they are entitled to and nothing more; shipping will fail later
with a permission error, and it is better to say so now.

Note the organization name back to the user. A token belongs to exactly one
organization, and deploying into the wrong one is a real mistake that is tedious to
undo.

## 2. Ship it

One call. `springroll.deploy` registers the application if it is new, attaches
whatever source you gave it, follows its effective Deployment workflow, and returns
the live URL. Direct applications target Production; Staged applications target
Development.

Choose what to send by looking at the project, not by asking the user:

| What you have | What to send |
|---|---|
| A git remote, pushed, on GitHub/GitLab/Bitbucket | `repositoryUrl`, plus `ref` if not the default branch |
| No remote, or uncommitted work you want deployed | `archive` |
| Both, and you are unsure whether the branch is pushed | Both (see below) |

```
springroll.deploy({
  name: "quarterly-close-tracker",
  supportContact: "#finance-tools on Slack",   // a production gate later; set it now
  archive: "<base64 tar+gzip>",
  idempotencyKey: "<stable per logical operation>"
})
```

`idempotencyKey` is required. Retrying with the same key replays the original result
instead of deploying twice, which is what makes a timeout safe to retry.

Producing the archive:

```bash
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude='.env*' \
    -czf - . | base64 -w0
```

**Sending both a repository and an archive is a good default when the branch may
not be pushed.** SpringRoll builds from git, and if the ref cannot be resolved it
falls back to the files you sent in that same call and tells you it did. It will
never fall back to an older upload: that would deploy stale code and report
success. Read `source.resolvedFrom` on the result to learn which one actually built,
and `source.fallbackReason` for the sentence explaining a fallback.

Things worth knowing before the first call fails:

- **`.env` files and `.git/` are refused outright**, naming the path. Configuration
  belongs in SpringRoll, not in the bundle. Set it as an environment variable on
  the application's environment instead.
- **A credential in the source is refused**, naming the file, the line, and the
  shape it matched. Remove the literal and read it from an environment variable.
  Do not try to obfuscate a value past the scanner.
- **Build output is dropped, not refused.** `node_modules`, `.next`, `dist`,
  `build`, `out`, `coverage`, `.turbo`, `.vercel` and `*.log` are skipped and
  reported in the warnings. SpringRoll runs the build; it needs source.
- **Limits:** roughly 3 MB compressed on the wire, 20 MB expanded, 2000 files,
  512 KB per file. The wire limit is a platform request-body cap, not a
  preference. A project past it should use a git repository; SpringRoll clones
  that directly and no size limit applies.
- `supportContact` and an owner are worth filling in properly: both are production
  gates later, and both are what a colleague sees when the app misbehaves. Do not
  invent a support channel; ask.

### Where it runs: placement hints and the receipt

You never name a hosting provider or a plan. SpringRoll scores every plan the
application is eligible for and returns the decision as a `placement` receipt on
the deploy result. `springroll.deploy` accepts an optional `placement` object of
provider-neutral hints. All thirteen fields are optional: `needs`,
`expectedRequestsPerMonth`, `expectedBandwidthGb`, `computeVcpu`, `memoryMb`,
`storageGb`, `region`, `coldStartTolerant`, `needsWebSockets`,
`needsBackgroundWork`, `needsPersistentDisk`, `productionCritical`, and
`budgetUsdPerMonth`. The object is strict: a field that is not on that list is
rejected rather than ignored.

`needs` is one flat list of everything the application requires. At most one shape
of thing being run (`static`, `serverless`, `server`, `container`), plus any
services it needs beside its own code (`postgres`, `auth`, `storage`, `realtime`,
`edge-functions`). Two shapes is a contradiction and is refused.

**`needs` narrows rather than ranks, so padding it can make placement fail.** A
provider that cannot supply an entry is excluded before cost is compared. Listing
`postgres` because the app "probably needs a database" can empty the candidate set.
Ask only for what the app actually uses, and leave the shape out unless the project
does something the source does not show.

The same restraint applies to the numbers. Send only what the user actually told you
or the source plainly shows. Anything omitted is inferred from the project, and every
inference comes back on the receipt as a named assumption with its evidence, so an
honest omission beats an invented figure. `budgetUsdPerMonth` deserves particular
care: a ceiling nobody asked for can exclude every qualified plan.

Relay the receipt, not just the URL:

- **Cost is a range with a confidence, never one figure.** Report
  `estimatedMonthlyCost` as its `minUsd` to `maxUsd` span; a single number gets
  read back as a quote SpringRoll never gave.
- **Say every `limits` entry before the user relies on the app.** A constrained plan can
  sleep, cold-start, or stop at a usage cap, and a limit nobody mentioned is a
  limit discovered in production.
- **Watch for a managed runtime that is not ready.** Vercel and Cloudflare run on
  SpringRoll-managed accounts. If the selected provider's exact managed
  configuration cannot execute, the deployment stops without switching providers.
  Repeat the receipt's action sentence to the user.
- `assumptions` names what was inferred. If the user corrects one, deploy again
  with the matching hint and the placement is re-scored.

### Costing it before you commit

`springroll.placement.preview` scores placement and returns the same receipt shape
without deploying, writing, or needing a provider account to be connected. Use it
when the user wants to know the cost before they commit.

It needs an application that already exists and already has the target environment,
so it cannot be the first call on a greenfield project. It defaults to `production`,
which is the strictest class; pass `environmentType` for anything else.

### If you would rather use a manifest

`springroll.deploy` accepts one, and `springroll.policy.check` will dry-run it
first: send it a `manifest` and it validates the document without creating anything.
Read the `springroll://manifest/example` resource before writing one. The manifest is
`apiVersion: springboard.dev/v1alpha1`, `kind: Application`. Rules the validator
enforces:

- Environment names are exactly `development`, `uat`, `production`.
- **Declaring `production` requires `uat`.** There are two separate checks, and the
  stricter one is the one that catches people: a production environment needs at
  least one non-production environment to promote from, and it specifically needs
  `uat`, because the UAT sign-off and UAT deployment gates can never be satisfied
  without one. A manifest with `production` and `development` but no `uat` passes
  the first check and fails the second.
- `class` must match the name: `production` is `production`, the others are
  `non-production`.
- `visibility: restricted` needs at least one group, user, or role listed.
- A variable whose key looks like a secret is rejected. SpringRoll never stores a
  secret in a manifest.
- `spec.source.type` is optional and advisory: SpringRoll derives it from whether
  a repository is present, and warns if the manifest says otherwise.

## 3. While it builds

`springroll.deploy` waits about twenty seconds and then answers honestly. A real
build usually takes longer than that. `waitSeconds` tunes it up to 60.

- `stillBuilding: true` → poll `springroll.deploy.status` with the returned
  `deploymentId` every few seconds.
- `READY` → share the URL. It is also embedded in the workspace, so "open the
  preview" in SpringRoll shows the running app in place.
- `FAILED` → call `springroll.deploy.status` with `includeLogs: true` and **read
  the actual build error before guessing**. Fix the project, then deploy again;
  do not retry the same build unchanged.

The full status vocabulary is `QUEUED`, `VALIDATING`, `BUILDING`, `DEPLOYING`,
`READY`, `FAILED`, `CANCELLED`, `SUPERSEDED`, `ROLLED_BACK`. Leave `includeLogs`
off while polling; it fetches a log tail you do not need until something fails.

To redeploy an application's current source without re-sending it, call
`springroll.deploy` with just the `application` and no source fields. To find out
why a deploy was refused for want of a source, `springroll.app.get` reports
`source.cannotBuildReason`.

## 4. Working with what is already there

- `springroll.app.list` is the catalog this token can see. Reach for it before
  registering something, so a second copy of an existing application does not get
  created under a slightly different name.
- `springroll.app.get` returns one application's record, and its `include` options
  add status and provenance. It reports `lifecycleStatus`, a risk score, pending
  approvals, and unapproved data access.
- `springroll.app.update` repairs metadata after the fact: `description`,
  `iconUrl`, `tags`, `department`, `supportContact`, `dataClassification`. An
  application registered in a hurry with no support contact is fixed here rather
  than re-registered.

## 5. Governed data access

An application reaches company data through SpringRoll's own identity and grants,
never through a credential you hold.

- `springroll.connect.data_products` lists what is available to ask for.
- `springroll.connect.request_access` asks a data owner for a scope. You may
  request; a data owner decides.
- `springroll.connect.access_status` reports where that request got to.

The `springroll://apps/{slug}/integration-guide/{dataProduct}/{environment}`
resource tells you which environment variables the application will receive once a
grant exists. It never contains their values, and neither do you.

## 6. Offer to record how it was built

Ask the user first: **do not do this without an explicit yes.**

`springroll.app.record_prompts` attaches the conversation that produced the
application to its record, as reference for whoever maintains it next. It is genuinely
useful: the reviewer approving a production release can read what the thing was asked
to do.

Say this plainly when you ask: the transcript is **stored** and **readable by anyone
who can see the application record**. SpringRoll scrubs credentials it recognises
before writing, but that scrubbing is best-effort and cannot be complete. If the
conversation contained a real secret, do not record it.

Send turns in order with `sessionKey` stable across calls, `role` one of `user`,
`assistant`, `system`, `tool`, and at most 50 turns per call. What lands is readable
back at `springroll://apps/{slug}/provenance`.

## 7. Hand back the link

Print the `webUrl` as a clickable link, and one line of what it shows: the
application's record in SpringRoll, with its environments, releases, and history.

Then tell the user what is true about where it stands:

- For a **Direct** application, it targeted Production immediately. Say whether the
  runtime and the remaining ownership, support, scan, authorization, and provider
  gates allowed it to become READY; Direct skips only the staged workflow approval
  and the two UAT gates that depend on it.
- For a **Staged** application, it is deployed to Development and is not yet in
  Production. To reach UAT, promote the recorded release; UAT may require approval,
  depending on the organization's policy.
- Staged Production requires a human approval. You can submit the request with
  `springroll.approval.submit` and `requestType: "PRODUCTION_PROMOTION"`, which
  routes it to the configured reviewers, but you cannot approve it, and neither can
  any agent. Once approved, `springroll.deploy.promote` ships the exact release that
  was reviewed.

**Confirm with the user before submitting any approval request.** It creates review
work for named people, and a request nobody wanted is somebody's afternoon. The
result carries `policyBlocking`, which tells you whether the application was already
gated at the moment you asked; if it was, run `springroll.policy.check` and fix that
first rather than leaving a reviewer to discover it.

Poll `springroll.approval.get` to find out whether a decision landed. Pending
requests across the organization are also readable at `springroll://approvals/pending`.

## What you cannot do, and should not attempt

- Approve anything, including a request you submitted.
- Bypass a required approval or any other production gate. Direct workflow skips
  only the staged promotion approval and the two UAT gates conditioned on it; it
  does not bypass runtime, ownership, support, scan, authorization, or provider
  checks.
- Grant the application connector access, or widen a scope it already has. Request it
  with `springroll.connect.request_access`; a data owner decides.
- Read a credential, connection string, or secret value.
- Roll back, retire, transfer ownership, change a domain, or widen an audience
  directly. Each is an approval request through `springroll.approval.submit`, and
  a person decides it.

If a call is refused, `springroll.policy.check` gives the named rule and
its remedy. Report that to the user rather than retrying.
