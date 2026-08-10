# CNDotaTi2026 Codex Instructions

This repository supports a local, advice-only TI2026 betting assistant for the user. Work in Chinese by default unless the user requests otherwise.

## Non-negotiable betting boundary

- Never log in to, control, click, script, or automate any betting website.
- Never place bets for the user.
- Never claim certainty or guarantee profit.
- Betting output is advice only. The user manually executes any bet outside Codex.
- If the user asks for a betting recommendation, read local files first and then provide a clear recommendation list.

## Required local context for betting advice

Before giving command-line betting advice, read these files in order:

1. `data/state.json`
2. `data/current_schedule.json`
3. `data/teams.json`
4. `data/players.json`
5. `data/bet_log.json`
6. The relevant `data/daily/*.json` file when a date is mentioned or a daily file was updated.

If a file is missing, stale, malformed, or conflicts with the user's message, say exactly which fact is uncertain and use the newest user-provided data as the override for that turn.

## Betting objective and policy

- Starting bankroll: CNY 981.42 unless `data/state.json` says otherwise.
- The emotional goal is supporting Chinese teams to win TI2026.
- The financial hedge is usually to bet against a Chinese team when that team faces a strong non-Chinese opponent.
- Chinese teams for this plan: `Xtreme Gaming`, `Team Resilience`, `Vici Gaming`.
- `LGD Gaming` has a Chinese organization identity but a South American roster in this local database; do not count it as a Chinese team for hedge rules unless the user explicitly changes that policy.
- If both teams are Chinese, usually skip or make only a very small bet on the clearly stronger side.
- If neither team is Chinese, recommend a bet only when the edge is clear and it helps preserve bankroll.
- Respect `daily_cap_fraction` and `single_match_cap_fraction` in `data/state.json`.

## Data maintenance

- Keep `data/teams.json` as the source of truth for team identity, rosters, aliases, China-team status, and baseline strength.
- Regenerate `data/players.json` after changing rosters.
- Keep `data/current_schedule.json` as the command-line input file for upcoming matches and decimal odds.
- Keep `data/bet_log.json` for bets actually placed by the user and settlements. Do not log a bet as placed unless the user says it was placed.
- Re-check current public sources before changing rosters, qualifiers, schedules, or match results.

## Development workflow

- Preserve the local frontend in `app/`; it stores browser-side data in `localStorage`.
- Run `npm run lint` and `npm run build` after code changes.
- For data-only changes, validate JSON with a parser.
- After each completed change requested by the user, commit and push to GitHub unless the user explicitly says not to.
- Remote repository: `https://github.com/ElouanDai/CNDotaTi2026.git`.
- Do not force-push or rewrite history unless the user explicitly asks.

## Response style

- Be concise and operational.
- For betting advice, show stake amounts in CNY and include total day exposure.
- End betting advice with a manual execution checklist, not with automated actions.
