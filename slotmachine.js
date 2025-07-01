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

const REEL_WIDTH = 150;
const START_X = 200;
const CENTER_Y = 300;
const SYMBOL_SPACING = 100;
const SPIN_SPEED = 1200;
const DECELERATION = 600;

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
  this.load.image("bonus_skateboard", "assets/sliced_bonus_scatter_1.png");
  this.load.image("scatter_screamer", "assets/sliced_bonus_scatter_2.png");
  this.load.image("scatter_badge", "assets/sliced_bonus_scatter_3.png");
  this.load.image("bonus_helmet", "assets/sliced_bonus_scatter_4.png");
}

async function create() {
  const initData = await apiInit();
  availableBets = initData.options.available_bets;
  currentBetIndex = Math.max(
    0,
    availableBets.indexOf(initData.options.default_bet)
  );
  currentBet = availableBets[currentBetIndex];
  const rows = initData.options.layout.rows;
  const cols = initData.options.layout.reels;
  for (let c = 0; c < cols; c++) {
    const reel = { sprites: [], speed: 0, stopTime: 0, spinning: false };
    const x = START_X + c * REEL_WIDTH;
    for (let r = 0; r < rows; r++) {
      const id = initData.options.screen[r][c];
      const y = CENTER_Y + (r - (rows - 1) / 2) * SYMBOL_SPACING;
      const sprite = this.add.sprite(x, y, symbolTextures[parseInt(id, 10)]);
      sprite.setScale(0.25);
      reel.sprites.push(sprite);
    }
    reels.push(reel);
  }

  balanceText = this.add.text(
    20,
    20,
    `Balance: ${initData.balance.wallet}`,
    { fontSize: "24px", fill: "#fff" }
  );
  betText = this.add.text(
    20,
    50,
    `Bet: ${currentBet}`,
    { fontSize: "24px", fill: "#fff" }
  );
  this.add
    .text(120, 50, "<", { fontSize: "24px", fill: "#fff" })
    .setInteractive()
    .on("pointerdown", () => {
      currentBetIndex =
        (currentBetIndex - 1 + availableBets.length) % availableBets.length;
      currentBet = availableBets[currentBetIndex];
      betText.setText(`Bet: ${currentBet}`);
    });
  this.add
    .text(150, 50, ">", { fontSize: "24px", fill: "#fff" })
    .setInteractive()
    .on("pointerdown", () => {
      currentBetIndex = (currentBetIndex + 1) % availableBets.length;
      currentBet = availableBets[currentBetIndex];
      betText.setText(`Bet: ${currentBet}`);
    });

  this.add
    .text(350, 500, "SPIN", { fontSize: "48px", fill: "#fff" })
    .setInteractive()
    .on("pointerdown", () => spin.call(this));
}

async function spin() {
  if (isSpinning) {
    return;
  }
  isSpinning = true;
  this.game.canvas.style.filter = "blur(4px)";

  const outcomePromise = apiSpin(currentBet);
  const now = this.time.now;
  for (let i = 0; i < reels.length; i++) {
    const reel = reels[i];
    reel.speed = SPIN_SPEED;
    reel.spinning = true;
    const delay = i * 300 + 1000;
    reel.stopTime = now + delay;
  }

  const result = await outcomePromise;
  finalScreen = result.outcome.screen;
  balanceText.setText(`Balance: ${result.balance.wallet}`);
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
        sprite.setTexture(
          symbolTextures[Math.floor(Math.random() * symbolTextures.length)]
        );
      }
    }
    if (time >= reel.stopTime) {
      reel.speed -= DECELERATION * (delta / 1000);
      if (reel.speed <= 0) {
        reel.speed = 0;
        reel.spinning = false;
        const symbolsForReel = [];
        if (finalScreen) {
          for (let r = 0; r < reel.sprites.length; r++) {
            symbolsForReel[r] = finalScreen[r][col];
          }
        }
        alignReel.call(this, reel, symbolsForReel);
      }
    }
  }
  if (!anySpinning) {
    isSpinning = false;
    this.game.canvas.style.filter = "";
  }
}

function alignReel(reel, finalSymbols) {
  reel.sprites.sort((a, b) => a.y - b.y);
  for (let i = 0; i < reel.sprites.length; i++) {
    const sprite = reel.sprites[i];
    const targetY = CENTER_Y - SYMBOL_SPACING + i * SYMBOL_SPACING;
    if (finalSymbols && finalSymbols[i] !== undefined) {
      sprite.setTexture(symbolTextures[parseInt(finalSymbols[i], 10)]);
    }
    this.tweens.add({
      targets: sprite,
      y: targetY,
      duration: 300,
      ease: "Cubic.easeOut",
    });
  }
}
