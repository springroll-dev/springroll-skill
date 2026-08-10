# Deployment

## Deploy to development

1. Inspect the project and call `springroll.context`. Require `runtime.ok` and `app:create` for a new app.
2. Choose source without asking whether git is required:
   - Pushed GitHub, GitLab, or Bitbucket remote: send `repositoryUrl` and non-default `ref` when needed.
   - Uncommitted or local-only work: send a base64 tar+gzip source `archive`.
   - Uncertain whether the ref is pushed: send both; SpringRoll may fall back to the supplied archive.
   - Existing app whose current source should be rebuilt: send neither source form.
3. Set a truthful `supportContact` when available and use a stable `idempotencyKey`.
4. Optionally validate a manifest first with `springroll.policy.check` and `springroll://manifest/example`.
5. Call `springroll.deploy`.
6. If still building, poll `springroll.deploy.status`. On `FAILED`, call it with `includeLogs: true` and diagnose the actual logs before changing code.
7. Share a preview URL only after `READY`.

Archive source only. Exclude `.git`, `.env*`, `node_modules`, `.next`, `dist`, `build`, `out`, `coverage`, `.turbo`, `.vercel`, and logs. Never evade credential scanning. Prefer git when the compressed archive approaches 3 MB, expands beyond 20 MB, exceeds 2,000 files, or contains files larger than 512 KB.

## Promote

1. Use a tested `READY` deployment ID.
2. Promote sequentially: development -> UAT -> production. The artifact is reused, not rebuilt.
3. Run `springroll.policy.check` for the target environment when policy readiness is uncertain.
4. For a required approval, ask before submitting it through `springroll.approval.submit`.
5. Poll `springroll.approval.get` until a human decision exists. Never decide it yourself.
6. After approval, call `springroll.deploy.promote` with the tested deployment ID, target environment, and idempotency key.
7. Poll the returned deployment with `springroll.deploy.status` to a terminal state.

Never describe an approval submission as a production deployment.
