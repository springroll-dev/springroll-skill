# Application records

The installed skill includes `assets/sdk/springroll-chat-actions-0.1.0.tgz` and five editable project templates. Use Node 24. Resolve paths relative to this skill directory, not the user's working directory.

```sh
node <skill-directory>/scripts/create-app.mjs --list
node <skill-directory>/scripts/create-app.mjs next-postgres <new-directory> <app-slug>
```

Choose `next-postgres` for Next.js/serverless with PostgreSQL, `node-postgres` for a Node server, `docker-postgres` for a Docker application, `node-redis` for a server using persistent Redis, or `worker-d1` for a Cloudflare Worker. The script writes source, build configuration, a manifest, and the SDK tarball into a new directory. It does not install dependencies, connect accounts or deploy. Run `npm install` then `npm run build` in that directory. The dependency uses the bundled `file:vendor/` tarball; do not substitute an unverified npm release.

Read and adapt the task collection's schema and authorization policy before deployment. Its example permits each member to read or change only records owned by that verified member. For team records, implement the application's real ownership and membership checks. Never accept a tenant, membership or owner identity from unverified input. Collections must match `springroll.json` exactly. Replace the example support contact with the real owner's contact.

The source imports `@springroll/chat-actions`, with `node`, `postgres`, `d1`, `redis`, and `example` subpaths. Next.js and Workers accept a standard `Request` and return a `Response`. Node and Docker use `nodeChatActionListener`. Mount only at `/.well-known/springroll/actions`.

A pure static frontend cannot serve this endpoint. Deploy its authenticated Node, serverless or Worker companion as a separate SpringRoll application, with that backend's own manifest, immutable release and owner-approved grants. Discover and operate collections using the backend application's ID. No frontend-to-backend mapping or custom endpoint URL is supported. A Next.js app with its own server handler can use its own application ID.

SpringRoll injects `SPRINGROLL_DATA_URL` and the environment-bound server identity `SPRINGROLL_DATA_TOKEN`. Postgres also needs `DATABASE_URL`; Redis needs `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the Upstash-prefixed equivalents work too); the Worker requires the `DB` D1 binding. Use the resource bindings from the prepared deployment. Never print the token or ask the user to paste it into chat. Keep credentials out of files submitted for deployment and out of the browser.

The disposable task examples install their record tables automatically. For a production app, move `POSTGRES_ACTION_SCHEMA` or `D1_ACTION_SCHEMA` into the app's migration process, then remove startup schema installation. Use Redis with persistence and a no-eviction policy; receipts and audit entries have no TTL. Do not use a best-effort cache as the only durable store.

The SDK verifies opaque delegation with the control plane, validates bounded collection schemas, runs the authorization callback, and commits a mutation with its idempotency receipt and audit in one store transaction or fixed Redis script. Replays and receipt reconciliation use the same verified principal and request. Update tools need the record's current version. There is no raw SQL, shell, Redis command or arbitrary URL tool.

The Redis adapter writes record, receipt and audit together with one `HSET` in a scoped version-1 hash. Earlier unpublished development fixtures used separate keys; recreate those disposable fixtures or review a data migration rather than assuming the formats are interchangeable.

For an existing application, copy the tarball into its `vendor/` directory, add `"@springroll/chat-actions": "file:vendor/springroll-chat-actions-0.1.0.tgz"`, and adapt the matching server handler and persistence store. Keep the existing application data and migrations. The bundled stores use dedicated record tables; integrating an existing domain model requires an app-owned adapter that commits the domain mutation, receipt and audit atomically and applies the app's authorization policy. A manifest by itself cannot make an existing app safe to write.

After building, use SpringRoll workload discovery and prepare deployment with the actual source files and required shape/services. Exclude dependencies and build outputs, but include the vendored SDK tarball in an archive or source-file upload. For an inline `files` upload, base64-encode every value in the path-to-content map and set `filesEncoding: "base64"`; do not treat the tarball as UTF-8. The owner reviews the deployed immutable release and approves its collection grants in SpringRoll settings. Repeat review when the release changes. Then use collection discovery and the normal prepare/confirmation flow.

If the installed skill lacks its assets, report an incomplete package rather than guessing an SDK version. Repository maintainers can rebuild a complete package with `npm run package:plugin`; normal plugin users do not need the repository.
