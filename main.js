// Snake with 🍓 score + ⭐ 3s invincibility
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

const GRID = 24;                 // 24x24 tiles
const TILE = canvas.width / GRID;
const TICK_MS = 110;

let state;

function randCell(avoidSet) {
  // avoidSet: Set of "x,y"
  while (true) {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);
    const k = `${x},${y}`;
    if (!avoidSet?.has(k)) return { x, y };
  }
}

function newGame() {
  state = {
    snake: [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    score: 0,
    alive: true,
    invincibleUntil: 0,  // timestamp ms
    strawberry: null,
    star: null,
    starActive: false,
    lastTick: 0,
  };

  placeStrawberry();
  placeStar();
  updateHUD();
  draw();
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
  // star appears sometimes; we keep one on board after a delay
  const avoid = snakeCellsSet();
  if (state.strawberry) avoid.add(`${state.strawberry.x},${state.strawberry.y}`);
  state.star = randCell(avoid);
  state.starActive = true;
}

function setInvincible(seconds = 3) {
  state.invincibleUntil = Date.now() + seconds * 1000;
  updateHUD();
}

function isInvincible() {
  return Date.now() < state.invincibleUntil;
}

function updateHUD() {
  scoreEl.textContent = state.score.toString();
  if (!state.alive) {
    statusEl.textContent = "遊戲結束（按重新開始）";
    return;
  }
  if (isInvincible()) {
    const left = Math.ceil((state.invincibleUntil - Date.now()) / 1000);
    statusEl.textContent = `無敵中（${left}s）`;
  } else {
    statusEl.textContent = "正常";
  }
}

function trySetDir(dx, dy) {
  // no 180-degree turn
  const { x, y } = state.dir;
  if (dx === -x && dy === -y) return;
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

function tick() {
  if (!state.alive) return;

  state.dir = state.nextDir;

  const head = state.snake[0];
  const newHead = { x: head.x + state.dir.x, y: head.y + state.dir.y };

  const inv = isInvincible();

  // Wall collision
  if (!inv && (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID)) {
    state.alive = false;
    updateHUD();
    draw();
    return;
  }

  // Wrap-around when invincible (fun bonus): bounce through walls
  if (inv) {
    if (newHead.x < 0) newHead.x = GRID - 1;
    if (newHead.x >= GRID) newHead.x = 0;
    if (newHead.y < 0) newHead.y = GRID - 1;
    if (newHead.y >= GRID) newHead.y = 0;
  }

  // Self collision (note: tail moves, so check after pop if not eating)
  const willEatStrawberry = state.strawberry && newHead.x === state.strawberry.x && newHead.y === state.strawberry.y;
  const willEatStar = state.starActive && state.star && newHead.x === state.star.x && newHead.y === state.star.y;

  // Move: add head first
  state.snake.unshift(newHead);

  if (willEatStrawberry) {
    state.score += 10;
    placeStrawberry();
  } else {
    // normal move: remove tail
    state.snake.pop();
  }

  if (willEatStar) {
    setInvincible(3);
    state.starActive = false;
    // respawn star after a short delay
    setTimeout(() => {
      if (!state.alive) return;
      placeStar();
    }, 1800);
  }

  // Self collision check AFTER movement
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

  // grid background
  ctx.globalAlpha = 0.18;
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  ctx.globalAlpha = 1;

  // strawberry 🍓
  if (state.strawberry) {
    drawEmoji("🍓", state.strawberry.x, state.strawberry.y);
  }

  // star ⭐
  if (state.starActive && state.star) {
    drawEmoji("⭐", state.star.x, state.star.y);
  }

  // snake
  const inv = isInvincible();
  for (let i = 0; i < state.snake.length; i++) {
    const p = state.snake[i];
    const pad = 2;
    ctx.beginPath();
    ctx.roundRect(p.x * TILE + pad, p.y * TILE + pad, TILE - pad * 2, TILE - pad * 2, 8);
    ctx.fillStyle = inv ? "rgba(255, 234, 120, 0.95)" : "rgba(122, 162, 255, 0.95)";
    if (i === 0) ctx.fillStyle = inv ? "rgba(255, 205, 84, 1)" : "rgba(160, 196, 255, 1)";
    ctx.fill();
  }

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
    // still update HUD countdown smoothly
    updateHUD();
  }
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
newGame();
