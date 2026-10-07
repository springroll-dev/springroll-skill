# ChatGPT plugin release evidence

This document records the local package and app-record integration acceptance completed on 2026-10-04. It does not assert that the integration has been published, approved by OpenAI, or exercised against a customer's provider accounts.

## Build the distributable

Use Node 24, install this repository's locked dependencies, and run:

```sh
npm run package:plugin
```

The command builds the versioned `@springroll/chat-actions` SDK, creates its local npm tarball, then assembles `dist/springroll-plugin/` and `dist/springroll-chatgpt-plugin.zip`. `BUILD-RECEIPT.json` hashes every packaged file and records the SDK hash. The package includes the plugin manifest, authenticated MCP endpoint configuration, skill, app-record reference, deterministic scaffold script, five editable templates, and SDK tarball. Neither scaffolding nor installing the SDK requires access to the SpringRoll repository. Dependency installation still needs an npm registry or a populated package cache.

The existing skill publication workflow now builds and tests this assembled artifact before synchronizing it to the public skill repository. It has not been invoked as part of this local implementation. The local `.claude` skill and published skill have identical authored instructions and use the new ChatGPT endpoint by default. The legacy MCP endpoint remains available independently.

## Rollout and authentication configuration

Deploy the control plane at a stable public HTTPS origin and set `SPRINGROLL_PUBLIC_URL` to that origin. Configure `DATABASE_URL` (and preferably `DATABASE_URL_UNPOOLED` for migration), `AUTH_SECRET`, and the persistent `SPRINGROLL_ENCRYPTION_KEYS` keyring. Install locked dependencies with `npm ci`, apply all pending migrations with `npm run db:migrate`, then build and deploy the matching source revision. The new tables are introduced by `0057_chatgpt_actions.sql`, `0058_openai_identity.sql`, and `0059_member_connections.sql`; use the migration runner rather than applying individual files out of order. Keep a worker running with `npm run worker`, or configure authenticated `POST /api/cron` scheduling with `SPRINGROLL_CRON_SECRET`, so confirmed actions and retries can complete.

The ChatGPT MCP endpoint is available with this deployment; it has no separate feature-enable environment variable. Its OAuth grants use the exact resource `{origin}/api/mcp/chatgpt` and scopes `springroll:read`, `springroll:deploy`, and `springroll:write`. The client needs only the scopes its tools use. Existing `/api/mcp` grants and manual agent tokens cannot authorize this resource. Configure the installed plugin/client to use the deployed origin and complete a fresh connection.

Keep these public routes reachable through the reverse proxy, without a proxy login wall:

| Purpose | URL at the configured origin |
|---|---|
| ChatGPT MCP endpoint | `/api/mcp/chatgpt` |
| ChatGPT resource discovery | `/.well-known/oauth-protected-resource/api/mcp/chatgpt` |
| OAuth authorization server discovery | `/.well-known/oauth-authorization-server` |
| Browser consent / public client registration | `/oauth/authorize` / `/api/oauth/register` |
| Token exchange / revocation | `/api/oauth/token` / `/api/oauth/revoke` |
| Optional SpringRoll OpenID discovery | `/.well-known/openid-configuration` |
| Optional SpringRoll public signing keys / UserInfo | `/api/oauth/jwks` / `/api/oauth/userinfo` |

Discovery and public client registration are unauthenticated; token, consent, and tool authorization remain enforced by SpringRoll. The root protected-resource document describes the legacy endpoint, so use the ChatGPT-specific discovery URL above. SpringRoll advertises Authorization Code with S256 PKCE and public-client token authentication (`none`).

Three independent connections must be configured deliberately:

- **ChatGPT → SpringRoll:** ordinary SpringRoll login works without Sign in with ChatGPT or an OpenAI API key. The browser preserves the pending authorization through sign-in, email verification, workspace creation, and account switching. Configure `RESEND_API_KEY` and a verified `SPRINGROLL_EMAIL_FROM` for public email onboarding. Consent selects one active organization and the requested scopes. Members revoke connections under `/{tenant}/settings/agents`; each write still needs its own authenticated confirmation.
- **OpenAI → SpringRoll website sign-in (optional):** only enable `SPRINGROLL_CHATGPT_SIGN_IN_ENABLED=true` after obtaining an OpenAI-issued client registration for the exact `{origin}/api/auth/callback/openai` callback. Set `SPRINGROLL_OPENAI_CLIENT_ID` and the registered `SPRINGROLL_OPENAI_TOKEN_AUTH_METHOD`; supply `SPRINGROLL_OPENAI_CLIENT_SECRET` when that method requires it. This adds the website and nested authorization-flow button. Existing users sign in first and explicitly link at `/oauth/openai/link`; matching email alone never links accounts. New accounts require a verified OpenAI email. Deployment-wide OIDC/SAML disables this button, and enterprise-managed accounts/domains retain their enterprise login. No OpenAI client credentials or approval are included in this repository.
- **SpringRoll-issued OpenID identity (optional):** `SPRINGROLL_OAUTH_SIGNING_JWK` independently enables `openid`, `profile`, `email`, ID tokens, and UserInfo. Supply a valid private RSA JWK JSON value from the deployment secret store; keep it stable across replicas. Only its public key is exposed by JWKS. Without the key, OpenID discovery returns 404 and these identity scopes are unavailable; MCP OAuth and the profile tool still work. This key is unrelated to the OpenAI sign-in client registration.

For member-owned business actions, set both `CHATGPT_NOTION_OAUTH_CLIENT_ID` / `CHATGPT_NOTION_OAUTH_CLIENT_SECRET` and/or both Salesforce equivalents. If dedicated values are absent, the corresponding existing `NOTION_OAUTH_*` or `SALESFORCE_OAUTH_*` values are used; the provider registration must also allow the new callbacks `{origin}/api/chatgpt/connections/notion/callback` and `{origin}/api/chatgpt/connections/salesforce/callback`. Salesforce requests `api refresh_token openid` with PKCE and supports the production or sandbox login hosts. Members connect at `/{tenant}/settings/chatgpt/connections`, then explicitly approve the source and allowed fields. A configured client or existing shared Connect credential does not grant member writes. For app records, the app owner separately approves the immutable release's declared collections at `/{tenant}/settings/chatgpt/collections`.

Before widening availability, verify the metadata's issuer/resource exactly match the deployed origin and run the external pilots below. OpenAI client issuance, the target ChatGPT workspace's installation permissions, any applicable publication review, provider OAuth registrations, and live account authorization remain external release prerequisites. ChatGPT subscription usage or model inference access is not granted by these identity or MCP connections.

## Verified locally

Validation used Node 24.19.0 and the repository's locked dependencies. The complete Vitest suite passed: **1,567 tests passed, eight skipped; 138 test files passed, one skipped**. This includes the real Postgres tests, OAuth and authorization, workload placement, provider adapters with simulated remote responses, SDK persistence, assembled plugin, and lifecycle recovery. The opt-in Redis tests are among the skips; they are not live Redis evidence. The final lifecycle receipt and operation suites also passed independently (21 tests).

The repository typecheck, mandatory full lint (zero errors), published-skill copy check, and standalone production build passed. The production-browser projects `chatgpt-plugin`, `agent-surface`, `signup`, and `onboarding` passed **83 tests with one intentional skip** for the optional local-provider onboarding simulation. This covers a new member's signup, email verification, workspace creation and resumed OAuth consent, existing-member connection, authenticated one-time confirmation, safe MCP Apps rendering, and text fallback. These are local browser protocol tests, not installation in actual ChatGPT clients.

The final standalone server booted directly from `.next/standalone/server.js`, exposed all 33 plugin tools and the correct resource metadata, and included both `postgres` and `bcryptjs` in its packaged dependencies. A separate production build with `VERCEL=1` also passed. Logs are local ignored artifacts under `e2e-report/`: `chatgpt-unit-acceptance.log`, `chatgpt-browser-verified.log`, `chatgpt-lint-final.log`, and `chatgpt-vercel-verified.log`.

| Area | Evidence |
|---|---|
| Protocol and authorization | Bad or changed delegations, expiry, collection input, denied record access, tenant separation, CAS conflicts, oversized bodies, receipt replay and lookup are covered by SDK tests. |
| Postgres durability | A real embedded Postgres verifies concurrent duplicate requests yield one record/receipt/audit, stale updates fail, and an audit failure rolls back the mutation. |
| D1 semantics | A transaction-backed SQLite implementation of the D1 batch protocol verifies conditional writes and rollback on audit failure. This is not a live Cloudflare D1 canary. |
| Redis protocol | Tests verify the fixed Lua invocation, key scope and arguments. The script checks types and versions before one `HSET` writes record, receipt and audit fields together. This avoids partial writes if a later Lua command would fail. A live Redis execution remains required. |
| Manifest portability | All five fixture manifests parse and preserve `spec.chatActions` through YAML export and reimport. Their source maps pass the deployment bundle decoder. |
| Placement confirmation | Tests cover frozen placement identity, workload/resource drift, async-context isolation and immutable source drift. The deployment service checks the approved placement before reserving it. |
| Lifecycle recovery | Real database tests recover cancel, suspend, resume and retirement from a receipt committed with the local effect, audit and provider job. Reconciliation rejects another operation, grant, member, tenant or target and never repeats a committed effect. Provider convergence remains separately reported. |
| Dispatch and transport | Tests reject access revoked or roles changed during preflight, retain UNKNOWN after concurrent dispatch, and bound DNS lookup and slow response streams with a total deadline. |
| Resource visibility | Runtime claims report actual environment bindings and unknown sharing when unbound; data services report application sharing. Pending claims with no external resource ID satisfy tool and panel output contracts. |
| Installed skill | Copied outside the repository, the scaffold produces five projects with no repository imports. Tests verify SDK hashes, complete manifests, binary tarball upload, no-overwrite behavior and template traversal refusal. |
| Real app builds | After installing the vendored SDK outside the repository, Node/Postgres, Node/Redis and Worker/D1 bundle successfully, and Next.js/Postgres produces a standalone production build with `/.well-known/springroll/actions`. The Docker template shares the verified Node/Postgres source and declares a non-root runtime; a Docker daemon build/run was not performed. |
| Archive | Python's standard ZIP verifier accepts `dist/springroll-chatgpt-plugin.zip`. |

The sample stores use dedicated document tables or Redis keys. They do not automatically turn an existing application's domain database into a record API. Existing applications need a reviewed server adapter, real record-level authorization, atomic domain mutation/receipt/audit, a redeployment, and owner approval for the new release.

For a pure static frontend, deploy an authenticated server companion as a separate SpringRoll application and operate the companion's application ID. The companion owns its own manifest, immutable release and collection grants. There is no backend-ID routing map, arbitrary endpoint override or direct static-app record support. A Next.js application serving its own backend endpoint can use its own application ID.

## Opt-in local Redis and Docker canaries

This Windows host has no `docker`, `redis-server` or `redis-cli` executable in PATH or the usual installation paths, no Redis listener on port 6379, and WSL reports that it is not installed. No engine or heavyweight tool was installed. These canaries are executable release checks, not completed evidence on this host.

On a host with a local Docker engine, start a disposable persistent Redis and run the opt-in suite (POSIX shell syntax):

```sh
docker run --detach --rm --name springroll-actions-redis-canary \
  --publish 127.0.0.1:16379:6379 redis:7-alpine \
  redis-server --appendonly yes --maxmemory-policy noeviction
SPRINGROLL_TEST_REDIS_URL=redis://127.0.0.1:16379 npm run test:chat-actions:redis
docker stop springroll-actions-redis-canary
```

PowerShell can set `$env:SPRINGROLL_TEST_REDIS_URL = 'redis://127.0.0.1:16379'` before the npm command. The suite refuses remote URLs and deletes only its random scoped keys and temporary ACL user. It verifies actual Lua execution, concurrent duplicates, stale versions, idempotency collision, malformed storage, ACL denial, scoped reads and member authorization. Without the environment variable it is skipped, never represented as a successful live test.

Run `npm run canary:chat-actions:docker` for the generated Docker/Postgres app. It refuses remote Docker contexts, creates an isolated network and database, builds the generated app, checks the non-root runtime, record/receipt/audit counts, replay, member denial and CAS, then removes its containers, network, image and temporary project. It uses a disposable local delegation verifier; it does not prove live SpringRoll OAuth or ChatGPT acceptance. It may pull the official Node and Postgres images and install app dependencies.

Redis's version-1 single-hash layout replaces an unpublished development fixture format using separate string/list/index keys. The SDK does not silently migrate those keys. Recreate disposable fixtures, or review and run a migration explicitly before retaining old development data.

## Launch scope and remaining pilots

Launch discovery includes the actual published Vercel and Cloudflare plans, implemented adapters, resource support and current account readiness. Redis maps to the `realtime` requirement, explicit PostgreSQL to `postgres`, generic database may select D1, and Docker to `container`. Static, serverless, server and container availability depends on the catalog and compatible source. Discovery does not advertise an unimplemented managed-auth resource or an inactive provider.

Before external availability, run these pilots with disposable accounts and records, recording the deployment revision, operation IDs, provider receipts and cleanup outcome:

1. Install the assembled plugin in the target ChatGPT/Codex client; complete OAuth, profile discovery, one-organization selection, refresh, logout/revocation, and member-access loss. Confirm the app works in text and with the optional panel. Finish any applicable OpenAI app submission/review separately.
2. Deploy each selected launch workload through the live discovery/prepare/human-confirm/status flow. Verify frozen placement, exact immutable source, actual readiness and resource bindings. Test the generated Node, Next.js, Worker and Docker variants on their eligible plans. No generic Cloudflare conversion of Next.js standalone output is promised.
3. For Postgres, D1 and persistent Redis, approve one release's task collection and create, read and update a disposable record. Verify a denied member cannot access another member's record, stale update rejection, revocation, lost-response receipt reconciliation, and exactly one audit with a replay. Run real Redis Lua and Docker container canaries.
4. Connect each member's own Notion and Salesforce accounts. Approve the exact source and fields, query/get an allowed record, and prepare/confirm one create and update. Verify Salesforce Task ownership, Notion scalar-property restrictions, revoked scopes, provider rate limits, concurrent edits and ambiguous network outcomes. Existing shared read credentials must not grant writes.
5. Exercise promote, rollback, cancel, suspend, resume and retire on disposable resources with existing policy approvals still enforced. Verify cross-organization denial and stale confirmation rejection at execution time.

Never infer successful provider execution from a queued operation or from these local tests. The generated skill directs users through authenticated confirmation and durable operation reconciliation. Remote publication, account configuration, provider pilots and external review remain deployment/release work.
