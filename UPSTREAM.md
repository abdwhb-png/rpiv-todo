# Upstream provenance

This repository is an autonomous fork of `juicesharp/rpiv-mono`'s Todo package.

- Upstream repository: https://github.com/juicesharp/rpiv-mono
- Upstream path: `packages/rpiv-todo`
- Latest merged upstream tag: `v2.11.0`
- Latest merged upstream commit: `61904e69e1a50e12585bdf15f0310e633a62ba36`
- Latest merged upstream Todo tree: `c3a78fa6c66f584a065e2704c1577d2796e6523f`
- Original import: `v2.7.1` at `3ae7bfbf7802ec9392a7d9228a30c82399a7f88b`
  (Todo tree `73c803f831aea8e435a83abc3b5e0fdc8b6d6e78`).

The upstream private `packages/test-utils` package is not published to npm.
`test/helpers/index.ts` and `test/helpers/manifest.ts` are narrow local adaptations
of the `createMockPi`, `createMockCtx`, `createMockUI`, `buildSessionEntries`,
`makeTodoToolResult`, `makeUserMessage`, `makeTheme`, and `verifyShipManifest`
helpers from its tree `5fc53c6f561942ee9ed802aa3859c4cc5b5ffef8` at the original import commit.
They deliberately exclude unrelated workflow helpers.
