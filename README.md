# @abdwhb-png/rpiv-todo

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<div align="center">
  <a href="https://github.com/abdwhb-png/rpiv-todo">
    <img src="https://raw.githubusercontent.com/abdwhb-png/rpiv-todo/main/docs/cover.png" alt="rpiv-todo — a persistent todo overlay for Pi Agent, showing a task panel with completed, in-progress, and pending rows" width="50%">
  </a>
</div>

Give the model a task list you can see. `rpiv-todo` adds a `todo` tool, a
`/todos` command, and a live panel above the editor to
[Pi Agent](https://github.com/badlogic/pi-mono), so you always know what the
agent is doing now, what it finished, and what is queued. The list is rebuilt
from the conversation itself, so it survives `/reload` and compaction — useful
on long research → design → implement sessions.

## Install

```sh
pi install git:github.com/abdwhb-png/rpiv-todo
```

Restart your Pi session.

### Update and rollback

The Git source follows this repository's default branch. Update it with:

```sh
pi update git:github.com/abdwhb-png/rpiv-todo
```

To roll back to the upstream npm package, switch the package source explicitly,
then restart Pi:

```sh
pi remove git:github.com/abdwhb-png/rpiv-todo
pi install npm:@juicesharp/rpiv-todo
```

Session history remains compatible because the persisted tool name (`todo`) and
widget identity are unchanged.

## Quick start

Run `/todos` after the restart to confirm the extension is loaded. On a fresh
session it prints:

```
No todos yet. Ask the agent to add some!
```

Then ask for something with several steps — "add a repository layer with tests,
and track it as todos". The model calls `todo` and the panel appears above your
input box, updating as work moves:

![Todo overlay panel: a Todos (2/7) heading above two struck-through completed rows, one in-progress row with its activity label, and four pending rows](https://raw.githubusercontent.com/abdwhb-png/rpiv-todo/main/docs/overlay.jpg)

Press `ctrl+shift+t` to collapse the panel to its heading plus a one-line hint,
and again to expand it. Run `/todos` at any time to print the full list grouped
by status.

## What you get

- **The plan stays on screen.** A panel above the editor shows every task with a
  status glyph, the label of whatever is in progress, and a `Todos (done/total)`
  heading — you never have to ask the agent where it is.
- **Tasks survive `/reload` and compaction.** Each tool call carries the full
  post-mutation snapshot, and the list is replayed from the session branch. No
  disk writes, nothing to lose.
- **Finished work gets out of the way.** Completed rows stay visible for the rest
  of the turn, then drop at the start of the next one; the panel disappears
  entirely when the list empties.
- **The overlay protects your transcript.** It adapts to the live terminal
  height, keeping room for the transcript and surrounding Pi UI. Past its
  budget it prioritizes in-progress work, then pending work, then completed
  work, and reports exactly what it hid.
- **The agent can sequence work, not just list it.** `blockedBy` dependencies are
  validated before anything is written — dangling ids, deleted dependencies,
  self-blocks, and cycles are all rejected.
- **Parallel sessions stay separate.** Task state is keyed by session, so a
  detached or child session can neither read nor overwrite the foreground list.
- **Localized UI, no setup required.** Nine locales ship with the package and
  activate when [`@juicesharp/rpiv-i18n`](https://www.npmjs.com/package/@juicesharp/rpiv-i18n)
  is installed; without it, everything falls back to English.

## Configuration

Optional. Create `~/.config/rpiv-todo/config.json` (or
`$XDG_CONFIG_HOME/rpiv-todo/config.json` if you set that variable):

```json
{
  "maxWidgetLines": 8,
  "responsive": {
    "minimumTranscriptRows": 12,
    "reservedNonTodoRows": 12
  },
  "collapseKey": "alt+t"
}
```

| Setting | What it does | Default |
| --- | --- | --- |
| `maxWidgetLines` | Maximum content rows the overlay may use, heading included. Minimum `3`. Applies on the next repaint. | `12` |
| `responsive` | Live vertical budget. With a valid terminal height, keeps `minimumTranscriptRows` for the transcript and `reservedNonTodoRows` for other Pi UI; tool expansion stays within that remaining content height. Set `enabled: false` to retain the legacy fixed/fully-expanded behavior. | enabled; `12` + `12` rows reserved |
| `collapseKey` | Key that collapses and expands the panel, in Pi keybinding form (`alt+o`, `ctrl+shift+t`). Set `"off"` to register no shortcut. Needs `/reload` to rebind. | `"ctrl+shift+t"` |
| `guidance` | Replaces the built-in instructions the extension gives the model about when and how to use the todo list. Needs `/reload`. | _(built-ins)_ |

A missing or malformed file falls back to these defaults. `rpiv-todo` only reads
this file — it never writes one. Full semantics:
[Configuration](https://github.com/abdwhb-png/rpiv-todo/blob/main/docs/configuration.md).

## Reference

- [`todo` tool reference](https://github.com/abdwhb-png/rpiv-todo/blob/main/docs/tool-schema.md)
  — every `todo` parameter, the status machine, the response envelope, and the
  exact error strings.
- [Configuration](https://github.com/abdwhb-png/rpiv-todo/blob/main/docs/configuration.md)
  — config file resolution, option validation rules, and the accepted keybinding
  grammar.
- [Overlay and `/todos`](https://github.com/abdwhb-png/rpiv-todo/blob/main/docs/overlay.md)
  — overlay lifecycle, glyphs, overflow behavior, `/todos` output, and
  localization.

## Requirements

- A Pi Agent host. No API key, no model selection, no native dependencies.
- An interactive session for the panel and `/todos`. Headless runs still get the
  `todo` tool; nothing is rendered.
- [`@juicesharp/rpiv-i18n`](https://www.npmjs.com/package/@juicesharp/rpiv-i18n)
  is an optional peer — install it for a localized UI, skip it for English.

## Related

- [`@juicesharp/rpiv-i18n`](https://www.npmjs.com/package/@juicesharp/rpiv-i18n)
  ([source](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-i18n))
  — localizes this extension's UI chrome and adds a `/languages` picker.
- [`@juicesharp/rpiv-pi`](https://www.npmjs.com/package/@juicesharp/rpiv-pi)
  ([source](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-pi))
  — the umbrella package that installs this extension alongside its siblings.

## Provenance

This independent Git fork starts from upstream `rpiv-todo` v2.7.1. It remains
marked `private` in `package.json` to prevent accidental npm publication. See
[UPSTREAM.md](UPSTREAM.md) for the exact source commit and local test-helper attribution.

## License

MIT — see [LICENSE](https://github.com/abdwhb-png/rpiv-todo/blob/main/LICENSE).
