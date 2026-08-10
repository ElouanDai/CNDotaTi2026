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
5. `data/team_profiles.json`
6. `data/bet_log.json`
7. The relevant `data/daily/*.json` file when a date is mentioned or a daily file was updated.

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
- Keep `data/team_profiles.json` as the source of truth for team style analysis: BP identity, hero pool, laning, macro, teamfight, pressure points, and hedge notes.
- Keep `data/bet_log.json` for bets actually placed by the user and settlements. Do not log a bet as placed unless the user says it was placed.
- Re-check current public sources before changing rosters, qualifiers, schedules, or match results.

## Daily schedule auto-update workflow

When the user asks Codex in the command line to automatically update upcoming or not-started TI2026 matches:

- Check current public sources before editing local schedule data. Use `https://www.dota2.com.cn/international/2026` first, then `https://liquipedia.net/dota2/Main_Page` and the relevant Liquipedia TI2026 page. If those pages are incomplete or unavailable, use reliable fallback esports schedule pages and clearly cite the fallback.
- Normalize all times to `Asia/Shanghai`.
- Sync only matches that have not started yet, unless the user explicitly asks for historical results.
- Preserve user-entered odds when the same match can be matched by date, time, and both teams. If no odds are available or the match is new, set decimal odds to `null`.
- Write the latest upcoming set to `data/current_schedule.json`; also write/update `data/daily/YYYY-MM-DD.json` for the operation date.
- If a schedule feed uses aliases or new display names, update aliases in `data/teams.json`; regenerate `data/players.json` after roster/name changes.
- Validate JSON with a parser, summarize changed matches, then commit and push after the completed update.

When the user asks for a realtime team-info update, update `data/team_profiles.json` from recent BP, hero pool, laning, macro, teamfight, and pressure-point evidence. Do not replace it with generic schedule or roster information.

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
