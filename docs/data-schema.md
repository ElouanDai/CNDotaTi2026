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
      "odds_a": null,
      "odds_b": null,
      "bookmaker": "optional",
      "notes": "optional"
    }
  ]
}
```

Use decimal odds. Team names can use aliases from `data/teams.json`; Codex should normalize aliases before judging Chinese-team status.

Use `null` odds for published matches whose bookmaker odds have not been entered yet.

## `data/team_profiles.json`

Stores the team-info database used by the homepage. Keep analysis focused on style and decision support:

- BP identity and hero-pool tendencies
- laning strength and early-map pressure
- macro, objective control, and tempo
- teamfight pattern and comeback risk
- pressure points and hedge notes

Do not use this file as a duplicate schedule or roster table.

## `data/state.json`

Keep current bankroll, pending exposure, risk caps, and special policies here. Update after daily settlement.

## `data/bet_log.json`

Append advice actually followed by the user and settlement results. The assistant should not assume a suggested bet was placed unless it appears here or the user states it.
