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
const SPIN_SPEED = 600; // pixels per second
const DECELERATION = 200; // pixels per second squared

const game = new Phaser.Game(config);
function preload() {
  // Replace with your symbol images
  this.load.image("seven", "assets/slot_symbol_1.png");
  this.load.image("cherry", "assets/slot_symbol_2.png");
  this.load.image("bell", "assets/slot_symbol_3.png");
  this.load.image("bar", "assets/slot_symbol_4.png");
  // add more as needed
}
const reels = []; // holds reel sprite arrays
const symbols = ["seven", "cherry", "bell", "bar"]; // symbol keys you loaded
let isSpinning = false;

function create() {
  for (let i = 0; i < 3; i++) {
    const reel = { sprites: [], speed: 0, stopTime: 0, spinning: false };
    const x = START_X + i * REEL_WIDTH;

    for (let j = 0; j < 3; j++) {
      const symbolKey = Phaser.Utils.Array.GetRandom(symbols);
      const y = CENTER_Y + (j - 1) * SYMBOL_SPACING; // vertical spacing
      const sprite = this.add.sprite(x, y, symbolKey);
      sprite.setScale(0.25); // scales to 40% of original size
      reel.sprites.push(sprite);
    }

    reels.push(reel);
  }

  // Add a "Spin" button
  const spinButton = this.add.text(350, 500, "SPIN", {
    fontSize: "48px",
    fill: "#fff",
  });
  spinButton.setInteractive().on("pointerdown", spin, this);
}
function spin() {
  if (isSpinning) {
    return;
  }

  isSpinning = true;

  const now = this.time.now;

  for (let i = 0; i < reels.length; i++) {
    const reel = reels[i];
    reel.speed = SPIN_SPEED;
    reel.spinning = true;
    // stagger stopping time so reels stop sequentially
    const delay = i * 700 + Phaser.Math.Between(500, 1000);
    reel.stopTime = now + delay;
  }
}

function update(time, delta) {
  if (!isSpinning) {
    return;
  }

  let anySpinning = false;

  for (const reel of reels) {
    if (!reel.spinning) {
      continue;
    }

    anySpinning = true;

    for (const sprite of reel.sprites) {
      sprite.y += reel.speed * (delta / 1000);
      if (sprite.y >= CENTER_Y + SYMBOL_SPACING) {
        sprite.y -= SYMBOL_SPACING * reel.sprites.length;
        sprite.setTexture(Phaser.Utils.Array.GetRandom(symbols));
      }
    }

    if (time >= reel.stopTime) {
      reel.speed -= DECELERATION * (delta / 1000);
      if (reel.speed <= 0) {
        reel.speed = 0;
        reel.spinning = false;
      }
    }
  }

  if (!anySpinning) {
    isSpinning = false;
  }
}
