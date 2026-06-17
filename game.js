// ── Constants ──────────────────────────────────────────────────────────────
const RED = 'red';
const BLACK = 'black';
const EMPTY = null;

// ── State ──────────────────────────────────────────────────────────────────
let board = [];      // 8x8 array of {color, king} | null
let currentTurn = RED;
let selectedSquare = null;   // {row, col} of selected piece
let validMoves = [];         // [{from, to, captures}]
let movesForSelected = [];   // subset of validMoves for selected piece
let gameOver = false;
let aiDepth = 3;
let moveNumber = 0;

// ── Board helpers ──────────────────────────────────────────────────────────
function emptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function initBoard() {
  const b = emptyBoard();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) b[r][c] = { color: BLACK, king: false };
        else if (r > 4) b[r][c] = { color: RED, king: false };
      }
    }
  }
  return b;
}

function copyBoard(b) {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

// ── Move generation ────────────────────────────────────────────────────────
function getJumps(b, r, c, piece, captured = []) {
  const dirs = piece.king
    ? [[-1,-1],[-1,1],[1,-1],[1,1]]
    : piece.color === RED
      ? [[-1,-1],[-1,1]]
      : [[1,-1],[1,1]];

  const jumps = [];
  for (const [dr, dc] of dirs) {
    const mr = r + dr, mc = c + dc;   // middle (enemy)
    const lr = r + 2*dr, lc = c + 2*dc; // landing
    if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
    const mid = b[mr]?.[mc];
    const land = b[lr]?.[lc];
    if (!mid || mid.color === piece.color) continue;
    if (land !== null) continue;
    const capKey = `${mr},${mc}`;
    if (captured.includes(capKey)) continue;

    // Execute jump on a temp board to find multi-jumps
    const nb = copyBoard(b);
    nb[mr][mc] = null;
    nb[lr][lc] = { ...piece };
    nb[r][c] = null;
    // King promotion mid-jump only if we stop here
    const becomesKing = !piece.king && ((piece.color === RED && lr === 0) || (piece.color === BLACK && lr === 7));
    const nextPiece = becomesKing ? { ...piece, king: true } : piece;

    const further = becomesKing ? [] : getJumps(nb, lr, lc, nextPiece, [...captured, capKey]);
    if (further.length === 0) {
      jumps.push({ from: { row: r, col: c }, to: { row: lr, col: lc }, captures: [...captured, capKey] });
    } else {
      jumps.push(...further.map(j => ({ ...j, from: { row: r, col: c } })));
    }
  }
  return jumps;
}

function getMoves(b, color) {
  const jumps = [];
  const steps = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p.color !== color) continue;

      // Jumps
      const pJumps = getJumps(b, r, c, p);
      jumps.push(...pJumps);

      // Simple steps (only if no jumps exist globally — added after)
      if (pJumps.length === 0) {
        const dirs = p.king
          ? [[-1,-1],[-1,1],[1,-1],[1,1]]
          : color === RED ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
          if (b[nr][nc] === null) {
            steps.push({ from: { row: r, col: c }, to: { row: nr, col: nc }, captures: [] });
          }
        }
      }
    }
  }

  // If any jump exists, only jumps are legal
  return jumps.length > 0 ? jumps : steps;
}

// ── Apply move ─────────────────────────────────────────────────────────────
function applyMove(b, move) {
  const nb = copyBoard(b);
  const piece = { ...nb[move.from.row][move.from.col] };
  nb[move.from.row][move.from.col] = null;
  for (const cap of move.captures) {
    const [cr, cc] = cap.split(',').map(Number);
    nb[cr][cc] = null;
  }
  nb[move.to.row][move.to.col] = piece;
  // King promotion
  if (!piece.king) {
    if (piece.color === RED && move.to.row === 0) nb[move.to.row][move.to.col].king = true;
    if (piece.color === BLACK && move.to.row === 7) nb[move.to.row][move.to.col].king = true;
  }
  return nb;
}

// ── Win detection ──────────────────────────────────────────────────────────
function checkWinner(b) {
  const redMoves = getMoves(b, RED);
  const blackMoves = getMoves(b, BLACK);
  const redPieces = b.flat().filter(p => p?.color === RED).length;
  const blackPieces = b.flat().filter(p => p?.color === BLACK).length;

  if (redPieces === 0 || redMoves.length === 0) return BLACK;
  if (blackPieces === 0 || blackMoves.length === 0) return RED;
  return null;
}

// ── Piece counts ───────────────────────────────────────────────────────────
function countPieces(b) {
  let red = 0, black = 0;
  for (const cell of b.flat()) {
    if (cell?.color === RED) red++;
    else if (cell?.color === BLACK) black++;
  }
  return { red, black };
}

// ── AI (minimax with alpha-beta) ───────────────────────────────────────────
function evaluate(b) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) continue;
      const val = p.king ? 3 : 1;
      // Positional bonus: center control and back-row defense
      const centerBonus = (r >= 2 && r <= 5 && c >= 2 && c <= 5) ? 0.15 : 0;
      const backBonus = (p.color === BLACK && r === 0) || (p.color === RED && r === 7) ? 0.25 : 0;
      const total = val + centerBonus + backBonus;
      score += p.color === BLACK ? total : -total;
    }
  }
  return score;
}

function minimax(b, depth, alpha, beta, maximizing) {
  const winner = checkWinner(b);
  if (winner) return winner === BLACK ? 1000 : -1000;
  if (depth === 0) return evaluate(b);

  const color = maximizing ? BLACK : RED;
  const moves = getMoves(b, color);
  if (moves.length === 0) return maximizing ? -1000 : 1000;

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const val = minimax(applyMove(b, m), depth - 1, alpha, beta, false);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const val = minimax(applyMove(b, m), depth - 1, alpha, beta, true);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(b, depth) {
  const moves = getMoves(b, BLACK);
  let bestVal = -Infinity;
  let best = null;
  for (const m of moves) {
    const val = minimax(applyMove(b, m), depth - 1, -Infinity, Infinity, false);
    if (val > bestVal) { bestVal = val; best = m; }
  }
  return best;
}

// ── Move notation ──────────────────────────────────────────────────────────
function toNotation(move) {
  const cols = 'abcdefgh';
  const from = `${cols[move.from.col]}${8 - move.from.row}`;
  const to = `${cols[move.to.col]}${8 - move.to.row}`;
  return move.captures.length > 0 ? `${from}×${to}` : `${from}-${to}`;
}

// ── Rendering ──────────────────────────────────────────────────────────────
function render() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';

  const validToSet = new Set(movesForSelected.map(m => `${m.to.row},${m.to.col}`));

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      sq.dataset.row = r;
      sq.dataset.col = c;
      sq.setAttribute('role', 'gridcell');

      const isDark = (r + c) % 2 === 1;

      if (selectedSquare && selectedSquare.row === r && selectedSquare.col === c) {
        sq.classList.add('selected');
      } else if (isDark && validToSet.has(`${r},${c}`)) {
        sq.classList.add('valid-move');
        sq.setAttribute('aria-label', `Move here: row ${8-r} col ${c+1}`);
        sq.addEventListener('click', () => onSquareClick(r, c));
      }

      const piece = board[r][c];
      if (piece) {
        const pd = document.createElement('div');
        pd.className = `piece ${piece.color}${piece.king ? ' king' : ''}`;
        if (selectedSquare?.row === r && selectedSquare?.col === c) pd.classList.add('selected-piece');

        const canSelect = !gameOver && piece.color === RED && currentTurn === RED;
        const hasMovesForThis = validMoves.some(m => m.from.row === r && m.from.col === c);
        if (canSelect && hasMovesForThis) {
          pd.style.cursor = 'pointer';
          pd.setAttribute('aria-label', `${piece.color}${piece.king ? ' king' : ''} piece at row ${8-r} col ${c+1}`);
          pd.setAttribute('tabindex', '0');
        }

        pd.addEventListener('click', () => onPieceClick(r, c));
        pd.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') onPieceClick(r, c); });
        sq.appendChild(pd);
      }

      boardEl.appendChild(sq);
    }
  }

  // Update counts
  const { red, black } = countPieces(board);
  document.getElementById('red-count').textContent = red;
  document.getElementById('black-count').textContent = black;

  // Active player highlight
  document.getElementById('red-score-card').classList.toggle('active', currentTurn === RED && !gameOver);
  document.getElementById('black-score-card').classList.toggle('active', currentTurn === BLACK && !gameOver);

  // Status
  const statusEl = document.getElementById('status');
  if (!gameOver) {
    statusEl.textContent = currentTurn === RED ? 'Your turn (Red)' : 'AI is thinking…';
  }
}

// ── Interaction ────────────────────────────────────────────────────────────
function onPieceClick(r, c) {
  if (gameOver || currentTurn !== RED) return;
  const piece = board[r][c];
  if (!piece || piece.color !== RED) return;

  const movesFromHere = validMoves.filter(m => m.from.row === r && m.from.col === c);
  if (movesFromHere.length === 0) return;

  selectedSquare = { row: r, col: c };
  movesForSelected = movesFromHere;
  render();
}

function onSquareClick(r, c) {
  if (!selectedSquare) return;
  const move = movesForSelected.find(m => m.to.row === r && m.to.col === c);
  if (!move) return;
  executeMove(move, RED);
}

function executeMove(move, color) {
  board = applyMove(board, move);
  moveNumber++;
  logMove(move, color);
  selectedSquare = null;
  movesForSelected = [];

  const winner = checkWinner(board);
  if (winner) {
    endGame(winner);
    return;
  }

  currentTurn = color === RED ? BLACK : RED;
  validMoves = getMoves(board, currentTurn);
  render();

  if (currentTurn === BLACK) {
    setTimeout(doAiMove, 350);
  }
}

function doAiMove() {
  const move = getBestMove(board, aiDepth);
  if (move) executeMove(move, BLACK);
}

function endGame(winner) {
  gameOver = true;
  render();
  const overlay = document.getElementById('game-over-overlay');
  const msg = document.getElementById('game-over-msg');
  msg.textContent = winner === RED ? '🎉 You win! Congratulations!' : '🤖 AI wins! Better luck next time.';
  overlay.classList.remove('hidden');
  document.getElementById('status').textContent = winner === RED ? 'You win!' : 'AI wins!';
}

function logMove(move, color) {
  const list = document.getElementById('move-list');
  const li = document.createElement('li');
  const who = color === RED ? 'You' : 'AI';
  li.textContent = `${who}: ${toNotation(move)}`;
  list.prepend(li);
}

function newGame() {
  board = initBoard();
  currentTurn = RED;
  selectedSquare = null;
  movesForSelected = [];
  validMoves = getMoves(board, RED);
  gameOver = false;
  moveNumber = 0;
  document.getElementById('move-list').innerHTML = '';
  document.getElementById('game-over-overlay').classList.add('hidden');
  document.getElementById('status').textContent = 'Your turn (Red)';
  render();
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.getElementById('new-game-btn').addEventListener('click', newGame);
document.getElementById('play-again-btn').addEventListener('click', newGame);
document.getElementById('difficulty').addEventListener('change', e => {
  aiDepth = parseInt(e.target.value, 10);
});

newGame();
