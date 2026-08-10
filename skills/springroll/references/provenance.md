# Build provenance

## Record a transcript

1. Ask the user every time before calling `springroll.app.record_prompts`.
2. Explain that stored turns are visible to anyone who can view the application and that secret scrubbing is best-effort.
3. Do not record if the conversation contains a real secret or sensitive content the user has not authorized for that audience.
4. Send ordered turns. Keep one stable `sessionKey` for the build and stable turn indexes so retries overwrite rather than duplicate.
5. Report the stored session and application.

## Read provenance

- Read `springroll://apps/{slug}/provenance` to list sessions.
- Read `springroll://apps/{slug}/provenance/{sessionKey}` for the turns in one session.

Treat provenance as shared application documentation, not private chat storage.
