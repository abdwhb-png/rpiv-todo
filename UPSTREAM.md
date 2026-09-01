# Upstream provenance

This repository is an autonomous fork of `juicesharp/rpiv-mono`'s Todo package.

- Upstream repository: https://github.com/juicesharp/rpiv-mono
- Upstream path: `packages/rpiv-todo`
- Upstream tag: `v2.7.1`
- Upstream commit: `3ae7bfbf7802ec9392a7d9228a30c82399a7f88b`
- Upstream Todo tree: `73c803f831aea8e435a83abc3b5e0fdc8b6d6e78`

The upstream private `packages/test-utils` package is not published to npm.
`test/helpers/index.ts` and `test/helpers/manifest.ts` are narrow local adaptations
of the `createMockPi`, `createMockCtx`, `createMockUI`, `buildSessionEntries`,
`makeTodoToolResult`, `makeUserMessage`, `makeTheme`, and `verifyShipManifest`
helpers from its tree `5fc53c6f561942ee9ed802aa3859c4cc5b5ffef8` at that same commit.
They deliberately exclude unrelated workflow helpers.
