# TI2026 betting assistant playbook

This project is advice-only. Codex must never automate or execute bets on any betting site.

## Objective

The user's bankroll starts at CNY 981.42. The emotional goal is a Chinese team winning TI2026. Betting advice should hedge that goal: when a Chinese team plays a strong non-Chinese opponent, prioritize a measured bet on the opponent. If the Chinese team wins, the user accepts the financial loss as the desired outcome. If the Chinese team loses, the hedge should recover money.

## Required read order for CLI advice

Before giving any betting recommendation, read these local files:

1. `data/state.json`
2. `data/current_schedule.json`
3. `data/teams.json`
4. `data/players.json`
5. `data/team_profiles.json`
6. `data/bet_log.json`
7. The newest matching `data/daily/*.json`, if the user mentions a date or says they updated a daily file.

If the files are missing, malformed, or stale compared with the user's message, state the issue and base the recommendation on the newest user-provided data.

## Betting rules

- Chinese teams for the hedge plan are `Xtreme Gaming`, `Team Resilience`, and `Vici Gaming`.
- `LGD Gaming` is a Chinese organization with a South American roster. Do not treat it as a Chinese team unless the user explicitly asks to support the org identity.
- If a match includes exactly one Chinese team, first consider betting the opponent.
- Increase stake when the opponent is materially stronger or has a favorable price.
- Reduce stake when the Chinese team is stronger; skip when the opponent is weak and odds are not attractive.
- If both teams are Chinese, either skip or make a very small bet on the clearly stronger side.
- If both teams are non-Chinese, bet only when the edge is clear enough to help maintain bankroll.
- All recommended and logged stake amounts must be whole CNY integers. Floor calculated stakes instead of rounding up near bankroll caps.
- Never suggest all-in, martingale, chasing losses, or betting more than the caps in `data/state.json`.

## Recommendation output

For each match, provide:

- Decision: bet or skip.
- Side/team and stake as a whole CNY integer.
- Odds used.
- Why this fits the hedge objective.
- Risk note: high/medium/low.
- Expected bankroll exposure for the day.

End with a compact execution checklist for the user to manually place bets.
