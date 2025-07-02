import { init as apiInit, spin as apiSpin } from "./api.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: {
    preload,
    create,
    update,
  },
};

const REEL_WIDTH = 200;
const START_X = 200;
const CENTER_Y = 300;
const SYMBOL_SPACING = 200;
const SPIN_SPEED = 2400;
const DECELERATION = 60000;

const symbolTextures = [
  "skateboard",
  "skate",
  "helmet",
  "tools",
  "shoe",
  "wheel",
  "can",
  "badge",
  "bonus_skateboard",
];

const reels = [];
let isSpinning = false;
let availableBets = [];
let currentBetIndex = 0;
let currentBet = 1;
let balanceText;
let betText;
let finalScreen = null;
let rows = 0;
let cols = 0;
let baseReels = [];
let currentScreen = [];
let spinButtonEl;
let betTxt;
const buttons = {};
let logoImage;
const game = new Phaser.Game(config);
let balance;
let currency;
let lastResult = null;
let winLine;
let winText;

function preload() {
  this.load.image("logo", "assets/logo.png");
  const { width, height } = this.cameras.main;
  const offset = 100;
  const progressBar = this.add.graphics();
  const progressBox = this.add.graphics();
  progressBox.fillStyle(0x222222, 0.8);
  progressBox.fillRect(width / 2 - 160, height / 2 + offset - 20, 320, 40);
  const loadingText = this.add
    .text(width / 2, height / 2 + offset - 50, "Dropping in...", {
      fontSize: "20px",
      color: "#ffffff",
    })
    .setOrigin(0.5);

  this.load.once("filecomplete-image-logo", () => {
    logoImage = this.add
      .image(width / 2, height / 2 - 100, "logo")
      .setOrigin(0.5);
  });
  const board = this.add.rectangle(
    width / 2 - 150,
    height / 2 + offset,
    60,
    10,
    0xffffff,
  );
  const wheelLeft = this.add.circle(
    board.x - 20,
    height / 2 + offset + 8,
    5,
    0x000000,
  );
  const wheelRight = this.add.circle(
    board.x + 20,
    height / 2 + offset + 8,
    5,
    0x000000,
  );

  this.load.on("progress", (value) => {
    progressBar.clear();
    progressBar.fillStyle(0xff6600, 1);
    progressBar.fillRect(
      width / 2 - 150,
      height / 2 + offset - 10,
      300 * value,
      20,
    );
    board.x = width / 2 - 150 + 300 * value;
    wheelLeft.x = board.x - 20;
    wheelRight.x = board.x + 20;
  });

  this.load.on("complete", () => {
    progressBar.destroy();
    progressBox.destroy();
    loadingText.destroy();
    board.destroy();
    wheelLeft.destroy();
    wheelRight.destroy();
  });

  this.load.image("skateboard", "assets/sliced_skate_image_1.png");
  this.load.image("skate", "assets/sliced_skate_image_2.png");
  this.load.image("helmet", "assets/sliced_skate_image_3.png");
  this.load.image("tools", "assets/sliced_skate_image_4.png");
  this.load.image("shoe", "assets/sliced_skate_image_new_1.png");
  this.load.image("wheel", "assets/sliced_skate_image_new_2.png");
  this.load.image("can", "assets/sliced_skate_image_new_3.png");
  this.load.image("badge", "assets/sliced_skate_image_new_4.png");
  this.load.image("bonus_skateboard", "assets/scatter_image_1.png");
  this.load.image("scatter_screamer", "assets/scatter_image_2.png");
  this.load.image("scatter_badge", "assets/scatter_image_3.png");
  this.load.image("bonus_helmet", "assets/scatter_image_4.png");
  this.load.audio("reelStop", "sounds/slotalign.wav");
}

function create() {
  const { width, height } = this.cameras.main;
  const continueText = this.add
    .text(width / 2, height / 2 + 60, "CONTINUE", {
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#222222",
      padding: { x: 10, y: 5 },
    })
    .setOrigin(0.5)
    .setInteractive();

  continueText.on("pointerdown", () => {
    if (logoImage) {
      logoImage.destroy();
    }
    continueText.destroy();
    startGame.call(this);
  });
}

async function startGame() {
  document.getElementById("ui").classList.remove("loading");
  const initData = await apiInit();
  currency = initData.options.currency;
  availableBets = initData.options.available_bets;
  currentBetIndex = Math.max(
    0,
    availableBets.indexOf(initData.options.default_bet),
  );
  currentBet = availableBets[currentBetIndex];
  rows = initData.options.layout.rows;
  cols = initData.options.layout.reels;
  baseReels = initData.options.reels.main.map((col) => [...col]);
  currentScreen = initData.options.screen.map((row) => [...row]);
  for (let c = 0; c < cols; c++) {
    const reel = {
      sprites: [],
      speed: 0,
      stopTime: 0,
      spinning: false,
      order: [],
      index: 0,
    };
    const x = START_X + c * REEL_WIDTH;
    for (let r = 0; r < rows; r++) {
      const id = currentScreen[r][c];
      const y = CENTER_Y + (r - (rows - 1) / 2) * SYMBOL_SPACING;
      const sprite = this.add.sprite(x, y, symbolTextures[parseInt(id, 10)]);
      sprite.setScale(0.3);
      reel.sprites.push(sprite);
    }
    reels.push(reel);
  }

  winLine = this.add.graphics();
  winText = this.add
    .text(this.cameras.main.width / 2, 80, "", {
      fontSize: "48px",
      color: "#ffffff",
      fontFamily: "Arial",
    })
    .setOrigin(0.5)
    .setVisible(false);
  winText.setShadow(0, 0, "#ffff00", 10, true, true);

  balanceText = document.getElementById("balanceValue");
  balance = initData.balance.wallet;
  balanceText.textContent = `${currency.symbol} ${(balance / currency.subunits).toFixed(currency.exponent)}`;
  betText = document.getElementById("betValue");
  updateUI();
  buttons.betUp = document.getElementById("betUp");
  buttons.betDown = document.getElementById("betDown");
  buttons.betUp.addEventListener("click", () => {
    currentBetIndex = (currentBetIndex + 1) % availableBets.length;
    currentBet = availableBets[currentBetIndex];
    updateUI();
  });
  buttons.betDown.addEventListener("click", () => {
    currentBetIndex =
      (currentBetIndex - 1 + availableBets.length) % availableBets.length;
    currentBet = availableBets[currentBetIndex];
    updateUI();
  });
  spinButtonEl = document.getElementById("spinButton");
  spinButtonEl.addEventListener("click", () => {
    if (isSpinning) {
      return;
    }
    spinButtonEl.classList.add("disabled");
    apiSpin(currentBet).then((result) => spin.call(this, result));
  });
}

function updateUI() {
  balanceText.textContent = `${currency.symbol} ${(balance / currency.subunits).toFixed(currency.exponent)}`;
  betText.textContent = `${currency.symbol} ${(currentBet / currency.subunits).toFixed(currency.exponent)}`;
}

async function spin(result) {
  if (result.error) {
    // handle error here
    alert(result.error);
  }
  console.log({
    screen: result.outcome.screen,
    words: result.outcome.screen.map((r) => r.map((c) => symbolTextures[c])),
  });
  if (isSpinning) {
    return;
  }
  lastResult = result;
  if (winLine) {
    winLine.clear();
  }
  if (winText) {
    winText.setVisible(false);
  }
  isSpinning = true;
  if (spinButtonEl) {
    spinButtonEl.classList.add("disabled");
  }
  // this.game.canvas.style.filter = "blur(4px)";

  finalScreen = result.outcome.screen;
  balance = `${result.balance.wallet}`;

  for (let c = 0; c < cols; c++) {
    const reel = reels[c];
    const lastCol = currentScreen.map((row) => row[c]).reverse();
    const finalCol = finalScreen.map((row) => row[c]).reverse();
    const delay = c * 300 + 1000;
    const constantTime = delay / 1000;
    const decelTime = SPIN_SPEED / DECELERATION;
    const travel = SPIN_SPEED * constantTime + 0.5 * SPIN_SPEED * decelTime;
    const loops = Math.max(
      lastCol.length + finalCol.length,
      Math.round(travel / (SYMBOL_SPACING * rows)),
    );
    const randomCount = Math.max(0, loops - lastCol.length - finalCol.length);
    const randomSymbols = Phaser.Utils.Array.Shuffle([...baseReels[c]]).slice(
      0,
      randomCount,
    );
    reel.order = [...lastCol, ...randomSymbols, ...finalCol];
    reel.index = 0;
  }

  const now = this.time.now;
  for (let i = 0; i < reels.length; i++) {
    const reel = reels[i];
    reel.speed = SPIN_SPEED;
    reel.spinning = true;
    const delay = i * 300 + 1000;
    reel.stopTime = now + delay;
  }
}

function update(time, delta) {
  if (!isSpinning) {
    return;
  }
  let anySpinning = false;
  for (let col = 0; col < reels.length; col++) {
    const reel = reels[col];
    if (!reel.spinning) {
      continue;
    }
    anySpinning = true;
    for (const sprite of reel.sprites) {
      sprite.y += reel.speed * (delta / 1000);
      if (sprite.y >= CENTER_Y + SYMBOL_SPACING) {
        sprite.y -= SYMBOL_SPACING * reel.sprites.length;
        const nextId = reel.order[reel.index % reel.order.length];
        reel.index++;
        sprite.setTexture(symbolTextures[parseInt(nextId, 10)]);
      }
    }
    if (time >= reel.stopTime) {
      reel.speed -= DECELERATION * (delta / 1000);
      if (reel.speed <= 0) {
        reel.speed = 0;
        reel.spinning = false;
        alignReel.call(this, reel, col);
      }
    }
  }
  if (!anySpinning) {
    isSpinning = false;
    // this.game.canvas.style.filter = "";
    if (spinButtonEl) {
      spinButtonEl.classList.remove("disabled");
    }
    if (finalScreen) {
      currentScreen = finalScreen.map((row) => [...row]);
      finalScreen = null;
    }
    if (lastResult && lastResult.outcome.win > 0) {
      highlightWin.call(this, lastResult.outcome);
    } else {
      clearWin();
    }
    lastResult = null;
  }
}

function alignReel(reel, col) {
  this.sound.play("reelStop");
  reel.sprites.sort((a, b) => a.y - b.y);
  for (let i = 0; i < reel.sprites.length; i++) {
    const sprite = reel.sprites[i];
    const targetY = CENTER_Y - SYMBOL_SPACING + i * SYMBOL_SPACING;
    this.tweens.add({
      targets: sprite,
      y: targetY,
      duration: 300,
      ease: "Cubic.easeOut",
    });
    if (finalScreen) {
      const id = finalScreen[i][col];
      sprite.setTexture(symbolTextures[parseInt(id, 10)]);
    }
  }
  updateUI();
}

function highlightWin(outcome) {
  if (!winLine || !winText) {
    return;
  }
  clearWin();
  if (outcome.wins && outcome.wins.length > 0) {
    const line = outcome.wins[0][2];
    winLine.lineStyle(6, 0xff0000, 1);
    winLine.beginPath();
    for (let c = 0; c < line.length; c++) {
      const row = line[c];
      const x = START_X + c * REEL_WIDTH;
      const y = CENTER_Y + (row - (rows - 1) / 2) * SYMBOL_SPACING;
      if (c === 0) {
        winLine.moveTo(x, y);
      } else {
        winLine.lineTo(x, y);
      }
    }
    winLine.strokePath();
  }
  const amount = (outcome.win / currency.subunits).toFixed(currency.exponent);
  winText.setText(`WIN ${currency.symbol} ${amount}`);
  winText.setVisible(true);
}

function clearWin() {
  if (winLine) {
    winLine.clear();
  }
  if (winText) {
    winText.setVisible(false);
  }
}

