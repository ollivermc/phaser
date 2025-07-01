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

const game = new Phaser.Game(config);

function preload() {
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

async function create() {
  const initData = await apiInit();
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

  // balanceText = this.add.text(20, 20, `Balance: ${initData.balance.wallet}`, {
  //   fontSize: "24px",
  //   fill: "#fff",
  // });

  balanceText = document.getElementById("balanceValue");
  balanceText.textContent = initData.balance.wallet;
  // betText = this.add.text(20, 50, `Bet: ${currentBet}`, {
  //   fontSize: "24px",
  //   fill: "#fff",
  // });
  // this.add
  //   .text(120, 50, "<", { fontSize: "24px", fill: "#fff" })
  //   .setInteractive()
  //   .on("pointerdown", () => {
  //     currentBetIndex =
  //       (currentBetIndex - 1 + availableBets.length) % availableBets.length;
  //     currentBet = availableBets[currentBetIndex];
  //     betText.setText(`Bet: ${currentBet}`);
  //   });
  // this.add
  //   .text(150, 50, ">", { fontSize: "24px", fill: "#fff" })
  //   .setInteractive()
  //   .on("pointerdown", () => {
  //     currentBetIndex = (currentBetIndex + 1) % availableBets.length;
  //     currentBet = availableBets[currentBetIndex];
  //     betText.setText(`Bet: ${currentBet}`);
  //   });

  betText = document.getElementById("betValue");

  buttons.betUp = document.getElementById("betUp");
  buttons.betDown = document.getElementById("betDown");
  buttons.betUp.addEventListener("click", () => {
    currentBetIndex = (currentBetIndex + 1) % availableBets.length;
    currentBet = availableBets[currentBetIndex];
    // betText.setText(`Bet: ${currentBet}`);
    betText.textContent = currentBet;
  });
  buttons.betDown.addEventListener("click", () => {
    currentBetIndex =
      (currentBetIndex - 1 + availableBets.length) % availableBets.length;
    currentBet = availableBets[currentBetIndex];
    // betText.setText(`Bet: ${currentBet}`);
    betText.textContent = currentBet;
  });
  spinButtonEl = document.getElementById("spinButton");
  spinButtonEl.addEventListener("click", () => spin.call(this));
}

async function spin() {
  if (isSpinning) {
    return;
  }
  isSpinning = true;
  if (spinButtonEl) {
    spinButtonEl.classList.add("disabled");
  }
  // this.game.canvas.style.filter = "blur(4px)";

  const result = await apiSpin(currentBet);
  finalScreen = result.outcome.screen;
  balanceText.textContent = `${result.balance.wallet}`;

  for (let c = 0; c < cols; c++) {
    const reel = reels[c];
    const lastCol = currentScreen.map((row) => row[c]);
    const finalCol = finalScreen.map((row) => row[c]);
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
    const delay = i * 300 + 1000; // this is how long that it runs spinning
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
        alignReel.call(this, reel);
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
  }
}

function alignReel(reel) {
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
  }
}
