# Application catalog

## Find and inspect

- Use `springroll.app.list` with `search` before assuming a slug or creating a duplicate.
- Use `springroll.app.get` for one application. Narrow `include` when only `source`, `history`, `status`, or `grants` is needed.
- Prefer `status` to answer where an app is in its lifecycle; prefer `history` for release and deployment chronology.

## Update metadata

Use `springroll.app.update` only when the user asks to change catalog metadata. Supported metadata includes description, icon URL, tags, department, support contact, and data classification.

Do not use it to widen visibility; visibility changes require governance approval. Do not invent operational contacts or classifications. Report the exact fields changed.
