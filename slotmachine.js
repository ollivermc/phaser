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

function create() {
  const reelWidth = 150;
  const startX = 200;
  const centerY = 300;

  for (let i = 0; i < 3; i++) {
    const reel = [];
    const x = startX + i * reelWidth;

    for (let j = 0; j < 3; j++) {
      const symbolKey = Phaser.Utils.Array.GetRandom(symbols);
      const y = centerY + (j - 1) * 100; // vertical spacing
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
  for (const reel of reels) {
    for (const symbolSprite of reel) {
      const newSymbolKey = Phaser.Utils.Array.GetRandom(symbols);
      symbolSprite.setTexture(newSymbolKey);
    }
  }
}
