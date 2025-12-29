// Snake with 🍓 score + ⭐ 3s invincibility + countdown bar (blinking near end) + high score
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

// Invincibility bar (safe-guarded)
const invincibleFill = document.getElementById("invincibleFill");
const invincibleBar = invincibleFill ? invincibleFill.parentElement : null;

const GRID = 24; // 24x24 tiles
const TILE = canvas.width / GRID;
const TICK_MS = 110;

const INV_TOTAL_MS = 3000;
const BLINK_THRESHOLD_MS = 900; // 剩下不到 0.9 秒開始閃

const HIGH_SCORE_KEY = "snake_high_score_v1";

let state;

function loadHighScore() {
  const raw = localStorage.getItem(HIGH_SCORE_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function saveHighScore(n) {
  localStorage.setItem(HIGH_SCORE_KEY, String(n));
}

function setHighScoreUI(n) {
  if (highScoreEl) highScoreEl.textContent = String(n);
}

function randCell(avoidSet) {
  while (true) {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);
    const k = `${x},${y}`;
    if (!avoidSet?.has(k)) return { x, y };
  }
}

function snakeCellsSet() {
  const s = new Set();
  for (const p of state.snake) s.add(`${p.x},${p.y}`);
  return s;
}

function placeStrawberry() {
  const avoid = snakeCellsSet();
  if (state.star) avoid.add(`${state.star.x},${state.star.y}`);
  state.strawberry = randCell(avoid);
}

function placeStar() {
  const avoid = snakeCellsSet();
  if (state.strawberry) avoid.add(`${state.strawberry.x},${state.strawberry.y}`);
  state.star = randCell(avoid);
  state.starActive = true;
}

function isInvincible() {
  return Date.now() < state.invincibleUntil;
}

function setInvincible(seconds = 3) {
  state.invincibleUntil = Date.now() + seconds * 1000;

  // show countdown bar safely
  if (invincibleBar && invincibleFill) {
    invincibleBar.style.opacity = "1";
    invincibleFill.style.width = "100%";
    invincibleBar.classList.remove("blink");
  }

  updateHUD();
}

function updateHighScoreIfNeeded() {
  if (!Number.isFinite(state.score)) return;
  if (state.score > state.highScore) {
    state.highScore = state.score;
    saveHighScore(state.highScore);
    setHighScoreUI(state.highScore);
  }
}

function updateHUD() {
  scoreEl.textContent = state.score.toString();
  setHighScoreUI(state.highScore);

  if (!state.alive) {
    statusEl.textContent = "遊戲結束（按重新開始）";
    updateHighScoreIfNeeded();

    if (invincibleBar) {
      invincibleBar.style.opacity = "0";
      invincibleBar.classList.remove("blink");
    }
    return;
  }

  if (isInvincible()) {
    const leftSec = Math.ceil((state.invincibleUntil - Date.now()) / 1000);
    statusEl.textContent = `無敵中（${leftSec}s）`;
  } else {
    statusEl.textContent = "正常";
  }

  // update countdown bar safely (each frame)
  if (invincibleBar && invincibleFill) {
    if (isInvincible()) {
      const left = state.invincibleUntil - Date.now();
      const percent = Math.max(left / INV_TOTAL_MS, 0);

      invincibleBar.style.opacity = "1";
      invincibleFill.style.width = `${percent * 100}%`;

      // Blink near end
      if (left <= BLINK_THRESHOLD_MS) {
        invincibleBar.classList.add("blink");
      } else {
        invincibleBar.classList.remove("blink");
      }
    } else {
      invincibleBar.style.opacity = "0";
      invincibleBar.classList.remove("blink");
    }
  }

  // keep high score synced while playing
  updateHighScoreIfNeeded();
}

function trySetDir(dx, dy) {
  const { x, y } = state.dir;
  if (dx === -x && dy === -y) return; // no 180 turn
  state.nextDir = { x: dx, y: dy };
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "arrowup" || k === "w") trySetDir(0, -1);
  if (k === "arrowdown" || k === "s") trySetDir(0, 1);
  if (k === "arrowleft" || k === "a") trySetDir(-1, 0);
  if (k === "arrowright" || k === "d") trySetDir(1, 0);
});

restartBtn.addEventListener("click", newGame);

function newGame() {
  const storedHigh = loadHighScore();

  state = {
    snake: [
      { x: 8, y: 12 },
      { x: 7, y: 12 },
      { x: 6, y: 12 },
    ],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },

    score: 0,
    highScore: storedHigh,

    alive: true,
    invincibleUntil: 0,

    strawberry: null,
    star: null,
    starActive: false,
  };

  placeStrawberry();
  placeStar();

  // reset bar visibility
  if (invincibleBar && invincibleFill) {
    invincibleBar.style.opacity = "0";
    invincibleFill.style.width = "100%";
    invincibleBar.classList.remove("blink");
  }

  setHighScoreUI(state.highScore);
  updateHUD();
  draw();
}

function tick() {
  if (!state.alive) return;

  state.dir = state.nextDir;

  const head = state.snake[0];
  const newHead = { x: head.x + state.dir.x, y: head.y + state.dir.y };

  const inv = isInvincible();

  // wall collision when NOT invincible
  if (!inv && (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID)) {
    state.alive = false;
    updateHUD();
    draw();
    return;
  }

  // wrap-around when invincible
  if (inv) {
    if (newHead.x < 0) newHead.x = GRID - 1;
    if (newHead.x >= GRID) newHead.x = 0;
    if (newHead.y < 0) newHead.y = GRID - 1;
    if (newHead.y >= GRID) newHead.y = 0;
  }

  const willEatStrawberry =
    state.strawberry && newHead.x === state.strawberry.x && newHead.y === state.strawberry.y;

  const willEatStar =
    state.starActive && state.star && newHead.x === state.star.x && newHead.y === state.star.y;

  // move: add head
  state.snake.unshift(newHead);

  // strawberry => grow + score
  if (willEatStrawberry) {
    state.score += 10;
    placeStrawberry();
  } else {
    state.snake.pop(); // normal move
  }

  // star => invincible + respawn later
  if (willEatStar) {
    setInvincible(3);
    state.starActive = false;

    setTimeout(() => {
      if (!state.alive) return;
      placeStar();
    }, 1800);
  }

  // self collision when NOT invincible
  if (!inv) {
    const headNow = state.snake[0];
    for (let i = 1; i < state.snake.length; i++) {
      if (state.snake[i].x === headNow.x && state.snake[i].y === headNow.y) {
        state.alive = false;
        break;
      }
    }
  }

  updateHUD();
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // soft grid
  ctx.globalAlpha = 0.14;
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  ctx.globalAlpha = 1;

  // foods
  if (state.strawberry) drawEmoji("🍓", state.strawberry.x, state.strawberry.y);
  if (state.starActive && state.star) drawEmoji("⭐", state.star.x, state.star.y);

  // cute snake
  const inv = isInvincible();
  const head = state.snake[0];

  // invincible aura
  if (inv) {
    const cx = head.x * TILE + TILE / 2;
    const cy = head.y * TILE + TILE / 2;
    const r = TILE * 0.85;
    const g = ctx.createRadialGradient(cx, cy, TILE * 0.1, cx, cy, r);
    g.addColorStop(0, "rgba(255, 255, 255, 0.25)");
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // tail -> head
  for (let i = state.snake.length - 1; i >= 0; i--) {
    const p = state.snake[i];
    const isHead = i === 0;

    const pad = 3;
    const x = p.x * TILE + pad;
    const y = p.y * TILE + pad;
    const w = TILE - pad * 2;
    const h = TILE - pad * 2;

    // body color
    ctx.fillStyle = inv
      ? "rgba(255, 220, 120, 0.96)"
      : "rgba(140, 200, 255, 0.96)";

    if (isHead) {
      ctx.fillStyle = inv
        ? "rgba(255, 200, 70, 1)"
        : "rgba(170, 225, 255, 1)";
    }

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();

    // jelly highlight
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.roundRect(x + w * 0.12, y + h * 0.1, w * 0.55, h * 0.28, 10);
    ctx.fill();
    ctx.restore();

    // face on head
    if (isHead) {
      const cx = p.x * TILE + TILE / 2;
      const cy = p.y * TILE + TILE / 2;

      const dx = state.dir.x;
      const dy = state.dir.y;

      const eyeOffsetX = dx * 3;
      const eyeOffsetY = dy * 3;

      const eyeY = cy - 5 + eyeOffsetY;
      const leftEyeX = cx - 6 + eyeOffsetX;
      const rightEyeX = cx + 6 + eyeOffsetX;

      const drawEye = (ex, ey) => {
        ctx.fillStyle = "rgba(20, 26, 38, 0.95)";
        ctx.beginPath();
        ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(ex - 1.1, ey - 1.2, 1.1, 0, Math.PI * 2);
        ctx.fill();
      };

      drawEye(leftEyeX, eyeY);
      drawEye(rightEyeX, eyeY);

      // blush
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(255, 120, 170, 1)";
      ctx.beginPath();
      ctx.arc(cx - 10, cy + 4, 4.2, 0, Math.PI * 2);
      ctx.arc(cx + 10, cy + 4, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // smile (toward front)
      ctx.strokeStyle = "rgba(20, 26, 38, 0.55)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx + dx * 6, cy + dy * 6 + 4, 4, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }

  // game over overlay
  if (!state.alive) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
    ctx.font = "14px system-ui";
    ctx.fillText("按「重新開始」再來一局", canvas.width / 2, canvas.height / 2 + 28);
  }
}

function drawEmoji(emoji, gx, gy) {
  ctx.font = `${TILE - 6}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, gx * TILE + TILE / 2, gy * TILE + TILE / 2 + 1);
}

// main loop
let last = 0;
function loop(ts) {
  if (!state) newGame();

  if (ts - last >= TICK_MS) {
    tick();
    last = ts;
  } else {
    // keep HUD + bar responsive
    updateHUD();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
newGame();
