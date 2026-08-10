# CNDotaTi2026

Local TI2026 Dota 2 betting assistant for a China-team hedge strategy. The app and data are advice-only: Codex provides recommendations, and the user manually executes any bet.

## Local frontend

```bash
npm install
npm run dev
```

Open `http://localhost:3000/`.

The frontend supports:

- daily schedule and decimal-odds entry
- bulk schedule import
- suggested hedge bet amount and side
- manual bet recording
- settlement and bankroll tracking
- editable team strength and China-team markers
- JSON export/import for browser-local state

Browser app data is stored in `localStorage` for the current browser.

## Command-line advice data

Future command-line betting advice should be based on these local files:

- `data/state.json`: bankroll, caps, and strategy state
- `data/current_schedule.json`: current upcoming schedule and odds
- `data/teams.json`: team identities, aliases, rosters, and baseline strength
- `data/players.json`: generated player index
- `data/bet_log.json`: bets actually placed by the user and settlements
- `data/daily/*.json`: optional per-day schedule files

Update `data/current_schedule.json` before asking Codex for a recommendation.

## Validation

```bash
npm run lint
npm run build
```

For data-only changes, validate JSON before committing.

## GitHub sync

Remote repository:

```bash
git remote add origin https://github.com/ElouanDai/CNDotaTi2026.git
git branch -M main
git push -u origin main
```

After this initial setup, use normal commits and `git push` after each completed change unless explicitly told not to.
