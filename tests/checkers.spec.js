// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");

const PAGE_URL = "file://" + path.resolve(__dirname, "..", "index.html");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function loadPage(page) {
  await page.goto(PAGE_URL);
  await expect(page.locator("#board .square")).toHaveCount(64);
}

const sq = (page, row, col) =>
  page.locator(`[data-row="${row}"][data-col="${col}"]`);

async function makeMove(page, fromRow, fromCol, toRow, toCol) {
  await sq(page, fromRow, fromCol).locator(".piece").click();
  await sq(page, toRow, toCol).click();
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Initial state", () => {
  test("page title is Checkers", async ({ page }) => {
    await loadPage(page);
    await expect(page).toHaveTitle("Checkers");
  });

  test("board has 64 squares", async ({ page }) => {
    await loadPage(page);
    await expect(page.locator(".square")).toHaveCount(64);
  });

  test("starts with 12 red and 12 black pieces", async ({ page }) => {
    await loadPage(page);
    await expect(page.locator(".piece.red")).toHaveCount(12);
    await expect(page.locator(".piece.black")).toHaveCount(12);
    await expect(page.locator("#red-count")).toHaveText("12");
    await expect(page.locator("#black-count")).toHaveText("12");
  });

  test("red pieces occupy rows 5-7 on dark squares", async ({ page }) => {
    await loadPage(page);
    for (let r = 5; r <= 7; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          await expect(sq(page, r, c).locator(".piece.red")).toBeVisible();
        }
      }
    }
  });

  test("black pieces occupy rows 0-2 on dark squares", async ({ page }) => {
    await loadPage(page);
    for (let r = 0; r <= 2; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          await expect(sq(page, r, c).locator(".piece.black")).toBeVisible();
        }
      }
    }
  });

  test('status shows "Your turn (Red)"', async ({ page }) => {
    await loadPage(page);
    await expect(page.locator("#status")).toHaveText("Your turn (Red)");
  });

  test("red score card is highlighted as active", async ({ page }) => {
    await loadPage(page);
    await expect(page.locator("#red-score-card")).toHaveClass(/active/);
    await expect(page.locator("#black-score-card")).not.toHaveClass(/active/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Piece selection
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Piece selection", () => {
  test("clicking a red piece selects it", async ({ page }) => {
    await loadPage(page);
    const piece = sq(page, 5, 0).locator(".piece");
    await piece.click();
    await expect(piece).toHaveClass(/selected-piece/);
  });

  test("selecting a piece shows valid move indicators", async ({ page }) => {
    await loadPage(page);
    await sq(page, 5, 0).locator(".piece").click();
    await expect(sq(page, 4, 1)).toHaveClass(/valid-move/);
  });

  test("clicking a different red piece re-selects", async ({ page }) => {
    await loadPage(page);
    await sq(page, 5, 0).locator(".piece").click();
    await sq(page, 5, 2).locator(".piece").click();
    await expect(sq(page, 5, 2).locator(".piece")).toHaveClass(/selected-piece/);
    await expect(sq(page, 5, 0).locator(".piece")).not.toHaveClass(/selected-piece/);
  });

  test("black pieces cannot be selected by the player", async ({ page }) => {
    await loadPage(page);
    const blackPiece = sq(page, 0, 1).locator(".piece");
    await blackPiece.click();
    await expect(blackPiece).not.toHaveClass(/selected-piece/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Making a move
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Making a move", () => {
  test("moving a piece updates its position", async ({ page }) => {
    await loadPage(page);
    await makeMove(page, 5, 0, 4, 1);
    await expect(sq(page, 4, 1).locator(".piece.red")).toBeVisible();
    await expect(sq(page, 5, 0).locator(".piece")).toHaveCount(0);
  });

  test("after red moves, AI responds and returns to player turn", async ({ page }) => {
    await loadPage(page);
    await makeMove(page, 5, 0, 4, 1);
    await expect(page.locator("#status")).toHaveText("Your turn (Red)", { timeout: 5000 });
  });

  test("move appears in move history", async ({ page }) => {
    await loadPage(page);
    await makeMove(page, 5, 0, 4, 1);
    await expect(page.locator("#move-list li").first()).toContainText("You:");
    await expect(page.locator("#move-list li").first()).toContainText("a3-b4");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// New game
// ─────────────────────────────────────────────────────────────────────────────

test.describe("New game", () => {
  test("New Game button resets the board", async ({ page }) => {
    await loadPage(page);
    await makeMove(page, 5, 0, 4, 1);
    await expect(page.locator("#status")).toHaveText("Your turn (Red)", { timeout: 5000 });
    await page.locator("#new-game-btn").click();
    await expect(page.locator(".piece.red")).toHaveCount(12);
    await expect(page.locator(".piece.black")).toHaveCount(12);
    await expect(page.locator("#move-list li")).toHaveCount(0);
    await expect(page.locator("#status")).toHaveText("Your turn (Red)");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty selector
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Difficulty selector", () => {
  test("dropdown has Easy, Medium, Hard options", async ({ page }) => {
    await loadPage(page);
    const opts = page.locator("#difficulty option");
    await expect(opts).toHaveCount(3);
    await expect(opts.nth(0)).toHaveText("Easy");
    await expect(opts.nth(1)).toHaveText("Medium");
    await expect(opts.nth(2)).toHaveText("Hard");
  });

  test("default difficulty is Medium", async ({ page }) => {
    await loadPage(page);
    await expect(page.locator("#difficulty")).toHaveValue("3");
  });

  test("changing difficulty persists and game still works", async ({ page }) => {
    await loadPage(page);
    await page.locator("#difficulty").selectOption("1");
    await expect(page.locator("#difficulty")).toHaveValue("1");
    await makeMove(page, 5, 0, 4, 1);
    await expect(page.locator("#status")).toHaveText("Your turn (Red)", { timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Accessibility", () => {
  test("board has role=grid", async ({ page }) => {
    await loadPage(page);
    await expect(page.locator("#board")).toHaveAttribute("role", "grid");
  });

  test("status region has aria-live=polite", async ({ page }) => {
    await loadPage(page);
    await expect(page.locator("#status")).toHaveAttribute("aria-live", "polite");
  });

  test("game over dialog has role=dialog", async ({ page }) => {
    await loadPage(page);
    await expect(page.locator("#game-over-overlay")).toHaveAttribute("role", "dialog");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Game over overlay
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Game over overlay", () => {
  test("overlay is hidden at game start", async ({ page }) => {
    await loadPage(page);
    await expect(page.locator("#game-over-overlay")).toHaveClass(/hidden/);
  });

  test("Play Again button resets the game", async ({ page }) => {
    await loadPage(page);
    await page.evaluate(() => {
      document.getElementById("game-over-overlay").classList.remove("hidden");
    });
    await page.locator("#play-again-btn").click();
    await expect(page.locator("#game-over-overlay")).toHaveClass(/hidden/);
    await expect(page.locator(".piece.red")).toHaveCount(12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Responsive layout
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Responsive layout", () => {
  test("board is visible on portrait mobile viewport (390x844)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loadPage(page);
    await expect(page.locator("#board")).toBeVisible();
    await expect(page.locator(".piece.red")).toHaveCount(12);
  });

  test("board is visible on landscape mobile viewport (844x390)", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await loadPage(page);
    await expect(page.locator("#board")).toBeVisible();
    await expect(page.locator(".piece.red")).toHaveCount(12);
  });
});
