# Checkers

A browser-based checkers game with an AI opponent, deployed to [checkers.local](http://checkers.local).

## Features

- Full standard checkers rules (mandatory jumps, multi-jumps, king promotion)
- Minimax AI with alpha-beta pruning — three difficulty levels (Easy / Medium / Hard)
- Click-to-move interface: select a red piece, then click a highlighted destination
- Move history log with algebraic notation
- Responsive layout (mobile-friendly)

## Project Structure

```
checkers/
├── index.html          # App shell, layout, and all styles
├── game.js             # Game engine, AI, and rendering
├── LICENSE
├── scripts/
│   └── deploy.sh       # Rsync deploy to /var/www/html
├── tests/
│   └── checkers.spec.js
├── package.json
├── playwright.config.js
└── .gitlab-ci.yml      # CI: run tests (Docker/node:20), deploy on main
```

## How to Play

1. **Red pieces** are yours; **Black pieces** belong to the AI.
2. Click one of your red pieces to select it — valid destinations are highlighted.
3. Click a highlighted square to move.
4. The AI responds automatically after your move.
5. **Jumps are mandatory** — if a jump is available, only jump moves are shown.
6. A piece reaching the opposite back rank becomes a **King** (♛) and can move in all four diagonal directions.
7. The game ends when a player has no pieces or no legal moves.

## Running Tests

```bash
npm install
npx playwright install
npm test
```

## Deploying

```bash
bash scripts/deploy.sh
```

## AI Details

The AI uses **minimax search with alpha-beta pruning**. Difficulty maps to search depth:

| Level | Depth |
|---|---|
| Easy | 1 |
| Medium | 3 (default) |
| Hard | 5 |
