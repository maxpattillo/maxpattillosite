See [AGENTS.md](./AGENTS.md) for the engineering rules for this project.

They are not optional, and most of them fail the build rather than the review.
Read the "What is actually enforced" table before assuming a rule is advisory.

See [DESIGN.md](./DESIGN.md) for the visual rules.

Less of it is mechanically enforced, which makes it easier to erode and no less
binding. Read "Do not use" before writing any CSS — it exists because silence in
a design file is where an agent falls back to defaults.

## Agent skills

### Issue tracker

GitHub Issues on `maxpattillo/maxpattillosite` (origin). Always pass `--repo`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
