# Checkers Web Implementation — Specification

## Overview

A browser-based implementation of American checkers (draughts) played on an 8×8 board. The human player controls the red pieces; an AI opponent controls the black pieces. The application runs entirely in the client with no server-side dependencies.

---

## Game Rules

### Board

- The board is an 8×8 grid of alternating light and dark squares.
- Play occurs exclusively on dark squares.
- Black pieces start on the dark squares of rows 0–2 (top of the board).
- Red pieces start on the dark squares of rows 5–7 (bottom of the board).
- Each side begins with 12 pieces.

### Turns

- Red moves first.
- Players alternate turns. A turn consists of one move or one jump sequence.

### Simple Moves

- A man (non-king) moves one square diagonally forward.
- Red men move toward row 0 (up the board). Black men move toward row 7 (down the board).
- A piece may only move to an unoccupied dark square.

### Jumps (Captures)

- A piece may jump an adjacent enemy piece if the square immediately beyond it (in the same diagonal direction) is empty.
- The captured piece is removed from the board immediately.
- **Jumps are mandatory.** If one or more jumps are available, the player must make a jump and may not make a simple move.
- **Multi-jumps are mandatory.** After landing from a jump, if further jumps are available from that position, the same piece must continue jumping in the same turn. The turn ends when no further jumps are available.
- A piece that has already been captured in the current turn's sequence may not be jumped again.

### King Promotion

- A man that reaches the opposite back rank (row 0 for red, row 7 for black) is promoted to a king and is marked with a crown symbol (♛).
- A king may move and jump diagonally in all four directions.
- If a piece reaches the back rank mid-jump, it is promoted and the multi-jump sequence ends (the piece does not continue jumping as a king in the same turn).

### End of Game

The game ends immediately when either:

1. A player has no pieces remaining on the board, or
2. A player has no legal moves on their turn (all remaining pieces are blocked).

The opposing player wins in both cases.

---

## Functional Requirements

### Game Engine

1. The engine shall generate all legal moves for the current player on each turn.
2. If any jump is available, the move list shall contain only jump moves; simple moves shall be excluded.
3. Multi-jump chains shall be computed recursively; the engine shall present the full chain as a single move (from origin to final landing square) rather than as individual steps.
4. The engine shall detect end-of-game conditions and declare the winner immediately when they occur.
5. Applying a move shall update the board, remove captured pieces, and apply king promotion.

### AI Opponent

6. The AI shall select its move using the **minimax algorithm with alpha-beta pruning**.
7. The search depth shall be configurable and shall map to three difficulty levels:

   | Level  | Search Depth |
   |--------|-------------|
   | Easy   | 1           |
   | Medium | 3 (default) |
   | Hard   | 5           |

8. The static evaluation function shall score positions by:
   - Material: each man counts as 1 point; each king counts as 3 points.
   - Position: a small bonus (0.15) for pieces occupying the central 4×4 region.
   - Back-row defense: a small bonus (0.25) for men on their own back rank.
   - Scores are positive for Black and negative for Red (the AI maximises, the player minimises).
9. The AI shall move after a **350 ms delay** following the player's move, to simulate thinking time.

### Move Notation

10. Moves shall be recorded in algebraic notation: columns are labelled `a`–`h` (left to right), rows are labelled `1`–`8` (bottom to top, so row 7 in zero-indexed terms is rank 1 and row 0 is rank 8).
11. Simple moves are written as `a3-b4`. Captures are written as `a3×b4`.
12. Only the origin and final landing square are recorded, even for multi-jumps.

---

## User Interface Requirements

### Layout

- Single-page application with no navigation.
- A header row containing the application title ("Checkers") on the left and the current game status on the right.
- A main area containing the board on the left and a sidebar on the right.
- The sidebar contains: a score panel, a controls panel (New Game button and difficulty selector), and a scrollable move history log.

### Board

- The board shall be rendered as an 8×8 CSS grid, with each cell occupying an equal share of the board's width and height.
- Board size shall be `min(72vw, 560px)` on desktop and `95vw` on viewports ≤ 600 px wide.
- Dark squares shall use colour `#769656`; light squares shall use `#eeeed2`.
- Red pieces shall use a radial gradient from `#e74c3c` to `#c0392b`.
- Black pieces shall use a radial gradient from `#34495e` to `#2c3e50`.
- King pieces shall display a `♛` crown symbol centred on the piece.

### Interaction

- Clicking a red piece selects it (if it has at least one legal move). The square beneath the piece is highlighted in yellow (`#f1c40f`).
- All valid destination squares for the selected piece shall be indicated by a semi-transparent yellow dot overlaid on the square.
- Clicking a highlighted destination square completes the move.
- Clicking a different red piece re-selects and updates the destination highlights.
- Black pieces and squares with no legal move shall not respond to clicks during the player's turn.
- No interaction is accepted while the AI is computing its move.

### Status and Feedback

- The status line shall read "Your turn (Red)" during the player's turn and "AI is thinking…" while the AI move is pending.
- The active player's score card shall be outlined in yellow; the inactive card shall have no outline.
- Piece counts in the score panel shall update immediately after each capture.

### Move History

- Each move shall be appended to the move history list with a prefix of "You:" or "AI:" followed by the algebraic notation.
- The most recent move shall appear at the top of the list.
- The list is scrollable and shows a maximum of the most recent entries within a fixed height.

### Game Over Overlay

- When the game ends, a modal overlay shall appear with the title "Game Over" and a message indicating who won.
- The overlay shall contain a "Play Again" button that starts a new game and closes the overlay.

### New Game

- Clicking "New Game" resets the board to the starting position, clears the move history, resets piece counts to 12, closes the game-over overlay if open, and returns the turn to Red.
- The selected difficulty level is preserved across new games.

### Mobile Responsiveness

- On viewports ≤ 600 px wide, the sidebar shall wrap below the board and the move log shall be hidden.
- The board shall occupy `95vw` on small viewports.

---

## Technical Requirements

- Implemented as two static files (`index.html` and `game.js`) with no runtime dependencies.
- All styles are written inline in `index.html` using a `<style>` block; there is no external stylesheet.
- All game logic and rendering are implemented in vanilla JavaScript in `game.js`, loaded as an external script by `index.html`.
- The application requires no server-side code, build tools, or package manager to run — open `index.html` directly in any modern browser.
- Running the test suite requires Node.js and npm (`npm install && npm test`).
- Compatible with all modern browsers (Chrome, Firefox, Safari, Edge).

---

## Accessibility

- The board element shall have `role="grid"` and `aria-label="Checkers board"`.
- Each cell shall have `role="gridcell"`.
- Destination squares shall have an `aria-label` describing the target position.
- Selectable pieces shall have `tabindex="0"` and respond to `Enter` and `Space` keypresses.
- The status line shall have `aria-live="polite"` so screen readers announce turn changes.
- The game-over overlay shall have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the title element.

---

## Testing

### Framework

Tests are written with [Playwright](https://playwright.dev/) and run against `index.html` directly via a `file://` URL — no dev server required. The test runner is Chromium headless.

### Running Tests

```bash
npm install
npx playwright install
npm test
```

### Continuous Integration

Tests run automatically on GitLab CI on every push to `main` or `dev`, and on every merge request targeting `main`. The pipeline installs Chromium inside a `node:20` Docker container, runs the full test suite, and uploads the HTML report as a downloadable artifact (14-day retention).

### Deployment

A deploy job runs automatically after tests pass on `main`. It runs on a self-hosted GitLab shell runner installed on the `checkers.local` server. The job runs `scripts/deploy.sh`, which backs up `/var/www/html` and rsyncs the repo into it (excluding dev-only files such as tests, node_modules, and config files).

### Test Suite Overview

25 tests organised into 8 groups:

| Group | Tests | Description |
|---|---|---|
| Initial state | 7 | Page title, 64 squares, 12+12 pieces, correct starting positions, status text, active score card |
| Piece selection | 4 | Highlight on click, valid-move indicators shown, re-selection updates highlight, black pieces non-selectable |
| Making a move | 3 | Piece relocates to destination, AI responds and returns to player's turn, move logged in history |
| New game | 1 | Board resets to 12+12, history clears, status resets |
| Difficulty selector | 3 | Correct options present, default is Medium, change persists and game continues |
| Accessibility | 3 | `role=grid` on board, `aria-live=polite` on status, `role=dialog` on overlay |
| Game over overlay | 2 | Overlay hidden at start, Play Again resets board |
| Responsive layout | 2 | Board visible on 390×844 portrait and 844×390 landscape mobile viewports |

---

## Deployment

```bash
bash scripts/deploy.sh
```

The script backs up `/var/www/html` and rsyncs the application files (excluding `tests/`, `node_modules/`, dev config files, and documentation) into `/var/www/html/`.

---

---

## File Structure

```
checkers/
├── index.html               # Application shell (HTML + inline CSS)
├── game.js                  # Game engine, AI, and UI logic
├── checkers-spec.md         # This document
├── LICENSE
├── playwright.config.js
├── package.json
├── scripts/
│   └── deploy.sh            # Deployment script (rsync to /var/www/html)
├── .gitlab-ci.yml           # GitLab CI/CD pipeline
└── tests/
    └── checkers.spec.js     # Playwright test suite (25 tests)
```
