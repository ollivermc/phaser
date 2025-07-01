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
const SPIN_SPEED = 1200; // faster initial speed
const DECELERATION = 600; // stops quickly for ~3s total spin

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
  // apply a blur effect while spinning
  this.game.canvas.style.filter = 'blur(4px)';

  const now = this.time.now;

  for (let i = 0; i < reels.length; i++) {
    const reel = reels[i];
    reel.speed = SPIN_SPEED;
    reel.spinning = true;
    // stagger stopping time so reels stop sequentially
    const delay = i * 300 + 1000;
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
        alignReel(reel);
      }
    }
  }

  if (!anySpinning) {
    isSpinning = false;
    // remove blur when spinning stops
    this.game.canvas.style.filter = '';
  }
}

function alignReel(reel) {
  // snap reel symbols so one is centered
  let closest = reel.sprites[0];
  for (const sprite of reel.sprites) {
    if (Math.abs(sprite.y - CENTER_Y) < Math.abs(closest.y - CENTER_Y)) {
      closest = sprite;
    }
  }
  const offset = CENTER_Y - closest.y;
  for (const sprite of reel.sprites) {
    sprite.y = Math.round(sprite.y + offset);
  }
}
