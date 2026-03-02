"use strict";

const STORAGE_KEYS = Object.freeze({
  bestRound: "dogeRunner.bestRound",
  bestScore: "dogeRunner.bestScore",
  difficulty: "dogeRunner.difficulty",
});

const GAME_STATE = Object.freeze({
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  OVER: "over",
});

const DIFFICULTY_PRESETS = Object.freeze({
  casual: {
    label: "休闲",
    playerHp: 120,
    playerSpeed: 250,
    roundDuration: 22,
    baseEnemies: 8,
    enemyGrowth: 1.2,
    maxEnemies: 44,
    baseEnemySpeed: 95,
    speedGrowth: 9,
    collisionDamage: 9,
    invincibleDuration: 0.55,
    sprintMultiplier: 1.9,
    sprintDrain: 52,
    sprintRecovery: 42,
    healPerRound: 15,
  },
  normal: {
    label: "标准",
    playerHp: 100,
    playerSpeed: 235,
    roundDuration: 20,
    baseEnemies: 10,
    enemyGrowth: 1.5,
    maxEnemies: 52,
    baseEnemySpeed: 115,
    speedGrowth: 12,
    collisionDamage: 11,
    invincibleDuration: 0.5,
    sprintMultiplier: 1.85,
    sprintDrain: 58,
    sprintRecovery: 36,
    healPerRound: 12,
  },
  hard: {
    label: "地狱",
    playerHp: 85,
    playerSpeed: 228,
    roundDuration: 18,
    baseEnemies: 12,
    enemyGrowth: 1.8,
    maxEnemies: 58,
    baseEnemySpeed: 130,
    speedGrowth: 15,
    collisionDamage: 13,
    invincibleDuration: 0.45,
    sprintMultiplier: 1.82,
    sprintDrain: 64,
    sprintRecovery: 31,
    healPerRound: 10,
  },
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

class DogeRunnerGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.avatar = document.getElementById("avatar");
    this.ui = {
      chapter: document.getElementById("chapter"),
      bestChapter: document.getElementById("best-chapter"),
      score: document.getElementById("score"),
      bestScore: document.getElementById("best-score"),
      timeout: document.getElementById("timeout"),
      ballCount: document.getElementById("ballCount"),
      mainHP: document.getElementById("mainHP"),
      hpBar: document.getElementById("hpBar"),
      timeBar: document.getElementById("timeBar"),
      sprintBar: document.getElementById("sprintBar"),
      sprintText: document.getElementById("sprintText"),
      startBtn: document.getElementById("startBtn"),
      pauseBtn: document.getElementById("pauseBtn"),
      restartBtn: document.getElementById("restartBtn"),
      difficulty: document.getElementById("difficulty"),
      overlay: document.getElementById("overlay"),
      overlayTitle: document.getElementById("overlayTitle"),
      overlayDesc: document.getElementById("overlayDesc"),
      overlayHint: document.getElementById("overlayHint"),
      toast: document.getElementById("toast"),
    };

    this.state = GAME_STATE.READY;
    this.lastTimestamp = performance.now();
    this.animationId = 0;
    this.toastTimer = 0;

    this.dpr = 1;
    this.viewport = { width: 0, height: 0 };
    this.bounds = { x: 24, y: 24, width: 600, height: 400 };

    this.round = 1;
    this.score = 0;
    this.roundRemaining = 0;
    this.enemies = [];

    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      sprint: false,
    };

    this.player = {
      x: 0,
      y: 0,
      radius: 14,
      maxHp: 100,
      hp: 100,
      baseSpeed: 235,
      sprintEnergy: 100,
      invincibleTime: 0,
    };

    this.bestRound = Number(localStorage.getItem(STORAGE_KEYS.bestRound) || 0);
    this.bestScore = Number(localStorage.getItem(STORAGE_KEYS.bestScore) || 0);

    const savedDifficulty = localStorage.getItem(STORAGE_KEYS.difficulty);
    this.selectedDifficulty = DIFFICULTY_PRESETS[savedDifficulty]
      ? savedDifficulty
      : "normal";
    this.preset = DIFFICULTY_PRESETS[this.selectedDifficulty];
    this.ui.difficulty.value = this.selectedDifficulty;
  }

  init() {
    this.bindEvents();
    this.resize();
    this.applyDifficulty(this.selectedDifficulty, false);
    this.enterReadyState();
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === GAME_STATE.RUNNING) {
        this.pauseGame();
      }
    });

    window.addEventListener("keydown", (event) => this.handleKeyboard(event, true));
    window.addEventListener("keyup", (event) => this.handleKeyboard(event, false));

    this.ui.startBtn.addEventListener("click", () => {
      if (this.state === GAME_STATE.PAUSED) {
        this.resumeGame();
        return;
      }
      if (this.state !== GAME_STATE.RUNNING) {
        this.startNewGame();
      }
    });

    this.ui.pauseBtn.addEventListener("click", () => {
      if (this.state === GAME_STATE.RUNNING) {
        this.pauseGame();
      } else if (this.state === GAME_STATE.PAUSED) {
        this.resumeGame();
      }
    });

    this.ui.restartBtn.addEventListener("click", () => this.startNewGame());

    this.ui.difficulty.addEventListener("change", (event) => {
      const { value } = event.target;
      if (this.state === GAME_STATE.RUNNING || this.state === GAME_STATE.PAUSED) {
        this.showToast("进行中无法改难度，请先重开。");
        this.ui.difficulty.value = this.selectedDifficulty;
        return;
      }
      this.applyDifficulty(value, true);
      this.enterReadyState();
    });
  }

  handleKeyboard(event, isPressed) {
    const code = event.code;
    const movementKeys = new Set([
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
    ]);

    if (movementKeys.has(code) || code === "Space") {
      event.preventDefault();
    }

    if (code === "ArrowUp" || code === "KeyW") this.input.up = isPressed;
    if (code === "ArrowDown" || code === "KeyS") this.input.down = isPressed;
    if (code === "ArrowLeft" || code === "KeyA") this.input.left = isPressed;
    if (code === "ArrowRight" || code === "KeyD") this.input.right = isPressed;
    if (code === "ShiftLeft" || code === "ShiftRight") this.input.sprint = isPressed;

    if (!event.repeat && isPressed && (code === "KeyP" || code === "Space")) {
      if (this.state === GAME_STATE.RUNNING) {
        this.pauseGame();
      } else if (this.state === GAME_STATE.PAUSED) {
        this.resumeGame();
      }
    }
  }

  applyDifficulty(key, showFeedback) {
    const nextPreset = DIFFICULTY_PRESETS[key];
    if (!nextPreset) return;

    this.selectedDifficulty = key;
    this.preset = nextPreset;
    localStorage.setItem(STORAGE_KEYS.difficulty, key);

    this.player.maxHp = nextPreset.playerHp;
    this.player.hp = nextPreset.playerHp;
    this.player.baseSpeed = nextPreset.playerSpeed;
    this.player.sprintEnergy = 100;

    this.roundRemaining = nextPreset.roundDuration;
    this.syncHud();

    if (showFeedback) {
      this.showToast("已切换到" + nextPreset.label + "难度");
    }
  }

  enterReadyState() {
    this.state = GAME_STATE.READY;
    this.round = 1;
    this.score = 0;
    this.roundRemaining = this.preset.roundDuration;
    this.player.hp = this.player.maxHp;
    this.player.sprintEnergy = 100;
    this.player.invincibleTime = 0;
    this.placePlayerToCenter();
    this.enemies = this.createEnemiesForRound(this.round);
    this.updateButtons();
    this.setOverlay(
      "准备开始",
      "点击“开始游戏”进入第 1 关，关卡越高，威胁越强。",
      "移动：W/A/S/D 或方向键 · 冲刺：Shift · 暂停：P 或空格",
      true
    );
    this.syncHud();
  }

  startNewGame() {
    this.round = 1;
    this.score = 0;
    this.roundRemaining = this.preset.roundDuration;
    this.player.hp = this.player.maxHp;
    this.player.sprintEnergy = 100;
    this.player.invincibleTime = 0;
    this.placePlayerToCenter();
    this.enemies = this.createEnemiesForRound(this.round);
    this.state = GAME_STATE.RUNNING;
    this.updateButtons();
    this.setOverlay("", "", "", false);
    this.showToast("第 1 关开始，保持移动。");
    this.syncHud();
  }

  pauseGame() {
    if (this.state !== GAME_STATE.RUNNING) return;
    this.state = GAME_STATE.PAUSED;
    this.updateButtons();
    this.setOverlay("游戏暂停", "你可以稍作休息，准备后继续挑战。", "按 P / 空格或点击继续", true);
  }

  resumeGame() {
    if (this.state !== GAME_STATE.PAUSED) return;
    this.state = GAME_STATE.RUNNING;
    this.updateButtons();
    this.setOverlay("", "", "", false);
    this.showToast("已继续游戏");
  }

  endGame() {
    this.state = GAME_STATE.OVER;

    const roundedScore = Math.floor(this.score);
    if (this.round > this.bestRound) {
      this.bestRound = this.round;
      localStorage.setItem(STORAGE_KEYS.bestRound, String(this.round));
    }
    if (roundedScore > this.bestScore) {
      this.bestScore = roundedScore;
      localStorage.setItem(STORAGE_KEYS.bestScore, String(roundedScore));
    }

    this.updateButtons();
    this.setOverlay(
      "挑战结束",
      "你到达了第 " + this.round + " 关，得分 " + roundedScore + "。",
      "点击“开始游戏”或“重新开始”再来一局。",
      true
    );
    this.syncHud();
  }

  advanceRound() {
    this.round += 1;
    this.roundRemaining = this.preset.roundDuration;
    this.player.hp = Math.min(
      this.player.maxHp,
      this.player.hp + this.preset.healPerRound
    );
    this.enemies = this.createEnemiesForRound(this.round);
    this.score += 120 * this.round;
    this.showToast("进入第 " + this.round + " 关，威胁升级！");
  }

  createEnemiesForRound(round) {
    const enemies = [];
    const count = Math.min(
      this.preset.maxEnemies,
      this.preset.baseEnemies + Math.floor((round - 1) * this.preset.enemyGrowth)
    );
    const speedBase = this.preset.baseEnemySpeed + (round - 1) * this.preset.speedGrowth;

    for (let i = 0; i < count; i += 1) {
      const radius = randomInt(8, 18);
      let x = 0;
      let y = 0;
      let tries = 0;

      do {
        x = random(this.bounds.x + radius, this.bounds.x + this.bounds.width - radius);
        y = random(this.bounds.y + radius, this.bounds.y + this.bounds.height - radius);
        tries += 1;
      } while (
        tries < 30 &&
        Math.hypot(x - this.player.x, y - this.player.y) < 130
      );

      const angle = random(0, Math.PI * 2);
      const speed = random(speedBase * 0.78, speedBase * 1.24);

      enemies.push({
        x,
        y,
        radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hue: randomInt(5, 355),
      });
    }

    return enemies;
  }

  update(deltaTime) {
    this.updatePlayer(deltaTime);
    this.updateEnemies(deltaTime);
    this.detectCollision();
    if (this.state !== GAME_STATE.RUNNING) return;

    this.score += deltaTime * (28 + this.round * 6);
    this.roundRemaining -= deltaTime;
    if (this.roundRemaining <= 0) {
      this.advanceRound();
    }

    if (this.player.invincibleTime > 0) {
      this.player.invincibleTime = Math.max(0, this.player.invincibleTime - deltaTime);
    }
  }

  updateIdleScene(deltaTime) {
    const slowRate = 0.35;
    this.updateEnemies(deltaTime * slowRate);
  }

  updatePlayer(deltaTime) {
    const axisX = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const axisY = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0);
    const magnitude = Math.hypot(axisX, axisY);
    if (!magnitude) {
      this.player.sprintEnergy = Math.min(
        100,
        this.player.sprintEnergy + this.preset.sprintRecovery * deltaTime
      );
      return;
    }

    const directionX = axisX / magnitude;
    const directionY = axisY / magnitude;
    const canSprint = this.input.sprint && this.player.sprintEnergy > 0;
    const speedMultiplier = canSprint ? this.preset.sprintMultiplier : 1;
    const speed = this.player.baseSpeed * speedMultiplier;

    if (canSprint) {
      this.player.sprintEnergy = Math.max(
        0,
        this.player.sprintEnergy - this.preset.sprintDrain * deltaTime
      );
    } else {
      this.player.sprintEnergy = Math.min(
        100,
        this.player.sprintEnergy + this.preset.sprintRecovery * deltaTime
      );
    }

    this.player.x += directionX * speed * deltaTime;
    this.player.y += directionY * speed * deltaTime;

    this.player.x = clamp(
      this.player.x,
      this.bounds.x + this.player.radius,
      this.bounds.x + this.bounds.width - this.player.radius
    );
    this.player.y = clamp(
      this.player.y,
      this.bounds.y + this.player.radius,
      this.bounds.y + this.bounds.height - this.player.radius
    );
  }

  updateEnemies(deltaTime) {
    for (const enemy of this.enemies) {
      enemy.x += enemy.vx * deltaTime;
      enemy.y += enemy.vy * deltaTime;

      if (enemy.x + enemy.radius >= this.bounds.x + this.bounds.width) {
        enemy.x = this.bounds.x + this.bounds.width - enemy.radius;
        enemy.vx *= -1;
      }
      if (enemy.x - enemy.radius <= this.bounds.x) {
        enemy.x = this.bounds.x + enemy.radius;
        enemy.vx *= -1;
      }
      if (enemy.y + enemy.radius >= this.bounds.y + this.bounds.height) {
        enemy.y = this.bounds.y + this.bounds.height - enemy.radius;
        enemy.vy *= -1;
      }
      if (enemy.y - enemy.radius <= this.bounds.y) {
        enemy.y = this.bounds.y + enemy.radius;
        enemy.vy *= -1;
      }
    }
  }

  detectCollision() {
    if (this.player.invincibleTime > 0) return;

    for (const enemy of this.enemies) {
      const minDistance = enemy.radius + this.player.radius;
      const collision =
        (enemy.x - this.player.x) * (enemy.x - this.player.x) +
          (enemy.y - this.player.y) * (enemy.y - this.player.y) <
        minDistance * minDistance;

      if (!collision) continue;

      this.player.hp = Math.max(0, this.player.hp - this.preset.collisionDamage);
      this.player.invincibleTime = this.preset.invincibleDuration;
      this.showToast("受到伤害 -" + this.preset.collisionDamage);

      if (this.player.hp <= 0) {
        this.endGame();
      }
      return;
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);

    const bg = ctx.createLinearGradient(0, 0, this.viewport.width, this.viewport.height);
    bg.addColorStop(0, "rgba(6, 15, 38, 0.96)");
    bg.addColorStop(1, "rgba(10, 24, 62, 0.96)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(119, 184, 255, 0.68)";
    ctx.strokeRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

    for (const enemy of this.enemies) {
      ctx.beginPath();
      ctx.fillStyle = "hsla(" + enemy.hue + ", 85%, 60%, 0.9)";
      ctx.shadowColor = "hsla(" + enemy.hue + ", 90%, 65%, 0.7)";
      ctx.shadowBlur = 8;
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    }
    ctx.shadowBlur = 0;

    const shouldFlicker =
      this.player.invincibleTime > 0 &&
      Math.floor(performance.now() / 90) % 2 === 0;
    if (!shouldFlicker) {
      this.drawPlayer();
    }
  }

  drawPlayer() {
    const ctx = this.ctx;
    const drawSize = this.player.radius * 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (this.avatar.complete && this.avatar.naturalWidth > 0) {
      ctx.drawImage(
        this.avatar,
        this.player.x - this.player.radius,
        this.player.y - this.player.radius,
        drawSize,
        drawSize
      );
    } else {
      ctx.fillStyle = "#f0f4ff";
      ctx.fillRect(
        this.player.x - this.player.radius,
        this.player.y - this.player.radius,
        drawSize,
        drawSize
      );
    }

    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(231, 240, 255, 0.92)";
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius + 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  syncHud() {
    this.ui.chapter.textContent = String(this.round);
    this.ui.bestChapter.textContent = String(this.bestRound);
    this.ui.score.textContent = String(Math.floor(this.score));
    this.ui.bestScore.textContent = String(this.bestScore);
    this.ui.timeout.textContent = Math.max(0, this.roundRemaining).toFixed(1);
    this.ui.ballCount.textContent = String(this.enemies.length);
    this.ui.mainHP.textContent =
      Math.ceil(this.player.hp) + " / " + this.player.maxHp;
    this.ui.sprintText.textContent = Math.floor(this.player.sprintEnergy) + "%";

    const hpPercent = (this.player.hp / this.player.maxHp) * 100;
    const timePercent = (this.roundRemaining / this.preset.roundDuration) * 100;
    const sprintPercent = this.player.sprintEnergy;

    this.ui.hpBar.style.width = clamp(hpPercent, 0, 100) + "%";
    this.ui.timeBar.style.width = clamp(timePercent, 0, 100) + "%";
    this.ui.sprintBar.style.width = clamp(sprintPercent, 0, 100) + "%";
  }

  updateButtons() {
    if (this.state === GAME_STATE.RUNNING) {
      this.ui.startBtn.textContent = "进行中";
      this.ui.startBtn.disabled = true;
      this.ui.pauseBtn.textContent = "暂停";
      this.ui.pauseBtn.disabled = false;
      return;
    }

    if (this.state === GAME_STATE.PAUSED) {
      this.ui.startBtn.textContent = "继续游戏";
      this.ui.startBtn.disabled = false;
      this.ui.pauseBtn.textContent = "继续";
      this.ui.pauseBtn.disabled = false;
      return;
    }

    this.ui.startBtn.textContent = "开始游戏";
    this.ui.startBtn.disabled = false;
    this.ui.pauseBtn.textContent = "暂停";
    this.ui.pauseBtn.disabled = true;
  }

  setOverlay(title, desc, hint, visible) {
    this.ui.overlayTitle.textContent = title;
    this.ui.overlayDesc.textContent = desc;
    this.ui.overlayHint.textContent = hint;
    this.ui.overlay.classList.toggle("visible", visible);
  }

  showToast(text) {
    this.ui.toast.textContent = text;
    this.ui.toast.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.ui.toast.classList.remove("show");
    }, 1700);
  }

  placePlayerToCenter() {
    this.player.x = this.bounds.x + this.bounds.width / 2;
    this.player.y = this.bounds.y + this.bounds.height / 2;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.viewport.width = rect.width;
    this.viewport.height = rect.height;

    const padding = clamp(Math.min(rect.width, rect.height) * 0.05, 20, 36);
    this.bounds = {
      x: padding,
      y: padding,
      width: Math.max(220, rect.width - padding * 2),
      height: Math.max(160, rect.height - padding * 2),
    };

    if (this.player.x === 0 && this.player.y === 0) {
      this.placePlayerToCenter();
      return;
    }

    this.player.x = clamp(
      this.player.x,
      this.bounds.x + this.player.radius,
      this.bounds.x + this.bounds.width - this.player.radius
    );
    this.player.y = clamp(
      this.player.y,
      this.bounds.y + this.player.radius,
      this.bounds.y + this.bounds.height - this.player.radius
    );

    for (const enemy of this.enemies) {
      enemy.x = clamp(
        enemy.x,
        this.bounds.x + enemy.radius,
        this.bounds.x + this.bounds.width - enemy.radius
      );
      enemy.y = clamp(
        enemy.y,
        this.bounds.y + enemy.radius,
        this.bounds.y + this.bounds.height - enemy.radius
      );
    }
  }

  loop(timestamp) {
    const deltaTime = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    if (this.state === GAME_STATE.RUNNING) {
      this.update(deltaTime);
    } else if (this.state === GAME_STATE.READY) {
      this.updateIdleScene(deltaTime);
    }

    this.render();
    this.syncHud();
    this.animationId = window.requestAnimationFrame((time) => this.loop(time));
  }
}

window.addEventListener("load", () => {
  const game = new DogeRunnerGame();
  game.init();
});
