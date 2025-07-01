const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: {
    preload,
    create,
    // update,
  },
};

const REEL_WIDTH = 150;
const START_X = 200;
const CENTER_Y = 300;
const SYMBOL_SPACING = 100;

const game = new Phaser.Game(config);
function preload() {
  // Replace with your symbol images
  this.load.image("seven", "assets/slot_symbol_1.png");
  this.load.image("cherry", "assets/slot_symbol_2.png");
  this.load.image("bell", "assets/slot_symbol_3.png");
  this.load.image("bar", "assets/slot_symbol_4.png");
  // add more as needed
}
const reels = []; // 3 reels
const symbols = ["seven", "cherry", "bell", "bar"]; // symbol keys you loaded
let isSpinning = false;

function create() {

  for (let i = 0; i < 3; i++) {
    const reel = [];
    const x = START_X + i * REEL_WIDTH;

    for (let j = 0; j < 3; j++) {
      const symbolKey = Phaser.Utils.Array.GetRandom(symbols);
      const y = CENTER_Y + (j - 1) * SYMBOL_SPACING; // vertical spacing
      const sprite = this.add.sprite(x, y, symbolKey);
      sprite.setScale(0.25); // scales to 40% of original size
      reel.push(sprite);
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

  let completed = 0;

  for (const reel of reels) {
    const cycles = Phaser.Math.Between(8, 15);
    spinReel.call(this, reel, cycles, () => {
      completed++;
      if (completed === reels.length) {
        isSpinning = false;
      }
    });
  }
}

function spinReel(reel, cycles, onComplete) {
  const spinStep = () => {
    let remaining = reel.length;
    for (const sprite of reel) {
      this.tweens.add({
        targets: sprite,
        y: sprite.y + SYMBOL_SPACING,
        duration: 100,
        ease: "Cubic.easeInOut",
        onComplete: () => {
          if (sprite.y > CENTER_Y + SYMBOL_SPACING) {
            sprite.y -= SYMBOL_SPACING * reel.length;
            sprite.setTexture(Phaser.Utils.Array.GetRandom(symbols));
          }
          remaining--;
          if (remaining === 0) {
            cycles--;
            if (cycles > 0) {
              spinStep();
            } else if (onComplete) {
              onComplete();
            }
          }
        },
      });
    }
  };

  spinStep();
}
