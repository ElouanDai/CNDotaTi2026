# Local data schema

## `data/current_schedule.json`

```json
{
  "operation_date": "2026-08-13",
  "matches": [
    {
      "id": "2026-08-13-001",
      "date": "2026-08-13",
      "time": "12:00",
      "stage": "Swiss Round 1",
      "format": "Bo3",
      "team_a": "Xtreme Gaming",
      "team_b": "Team Falcons",
      "odds_a": 1.85,
      "odds_b": 1.95,
      "bookmaker": "optional",
      "notes": "optional"
    }
  ]
}
```

Use decimal odds. Team names can use aliases from `data/teams.json`; Codex should normalize aliases before judging Chinese-team status.

## `data/state.json`

Keep current bankroll, pending exposure, risk caps, and special policies here. Update after daily settlement.

## `data/bet_log.json`

Append advice actually followed by the user and settlement results. The assistant should not assume a suggested bet was placed unless it appears here or the user states it.
