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
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: "canvas-container", // match your DOM
  },
};

const REEL_WIDTH = 200;
let startX = 200;
let centerY = 300;
const SYMBOL_SPACING = 200;
const SPIN_SPEED = 2400;
const DECELERATION = 60000;

// Game settings with defaults
const settings = {
  quickSpin: false,
  rightHand: true,
  music: true,
  sound: true,
  volume: 1,
};

let settingsButton;
let settingsContainer;
let bgMusic;

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
let spinButton;
let betUpButton;
let betDownButton;
let finalScreen = null;
let rows = 0;
let cols = 0;
let baseReels = [];
let currentScreen = [];
let uiContainer;
let logoImage;
const game = new Phaser.Game(config);
let balance;
let currency;
let lastResult = null;
let winLine;
let winText;
const offset = 100;
let spriteScale = 0.3;

function preload() {
  this.load.image("logo", "assets/logo.png");
  const { width, height } = this.cameras.main;

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
      .image(width / 2, height / 2 - offset, "logo")
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

  this.load.image("spin", "assets/spin.png");
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
  this.load.audio("bgMusic", "music/Spinning Lights.mp3");
}

function create() {
  createWelcomeScreen.call(this);
}

function createWelcomeScreen() {
  const { width, height } = this.cameras.main;
  const container = this.add.container(0, 0);

  const bg = this.add
    .rectangle(width / 2, height / 2, width, height, 0x111111, 0.9)
    .setOrigin(0.5);

  const title = this.add
    .text(width / 2, height / 2 - 150, "SKATE SLOTS", {
      fontSize: "64px",
      color: "#ffffff",
      fontFamily: "Arial Black",
    })
    .setOrigin(0.5);

  const board = this.add
    .image(width / 2, height / 2 + 30, "skateboard")
    .setScale(0.6)
    .setOrigin(0.5);

  const startButton = this.add
    .text(width / 2, height - 100, "START", {
      fontSize: "48px",
      color: "#ffffff",
      backgroundColor: "#444",
      padding: { x: 10, y: 5 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const symbols = ["helmet", "shoe", "can", "badge"];
  symbols.forEach((key, idx) => {
    const angle = (Math.PI * 2 * idx) / symbols.length;
    const radius = 220;
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;
    const sprite = this.add.image(x, y, key).setScale(0.4);
    container.add(sprite);
  });

  startButton.on("pointerdown", () => {
    if (logoImage) {
      logoImage.destroy();
    }
    container.destroy(true);
    startGame.call(this);
  });

  container.add([bg, title, board, startButton]);
}

async function startGame() {
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

  // start background music if enabled
  if (!bgMusic) {
    bgMusic = this.sound.add("bgMusic", { loop: true, volume: settings.volume });
  }
  this.sound.volume = settings.volume;
  if (settings.music) {
    bgMusic.play();
  }
  for (let c = 0; c < cols; c++) {
    const reel = {
      sprites: [],
      speed: 0,
      stopTime: 0,
      spinning: false,
      order: [],
      index: 0,
    };
    const x = startX + c * REEL_WIDTH;
    for (let r = 0; r < rows; r++) {
      const id = currentScreen[r][c];
      const y = centerY + (r - (rows - 1) / 2) * SYMBOL_SPACING;
      const sprite = this.add.sprite(x, y, symbolTextures[parseInt(id, 10)]);
      sprite.setScale(spriteScale);
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

  balance = initData.balance.wallet;

  // Phaser based UI
  balanceText = this.add.text(0, 0, "", {
    fontSize: "36px",
    color: "#ffffff",
    fontFamily: "Arial",
  });

  betText = this.add.text(0, 0, "", {
    fontSize: "36px",
    color: "#ffffff",
    fontFamily: "Arial",
  });

  spinButton = this.add
    // .image(0, 0, "spin")
    // .setScale(0.5)
    .text(0, 0, "SPIN", {
      fontSize: "60px",
      color: "#ffffff",
      backgroundColor: "#444",
      padding: { x: 10, y: 5 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      if (isSpinning) {
        return;
      }
      spinButton.setAlpha(0.5);
      apiSpin(currentBet).then((result) => spin.call(this, result));
    })
    .on("pointerup", () => {
      if (!isSpinning) {
        spinButton.setAlpha(1);
      }
    })
    .on("pointerout", () => {
      if (!isSpinning) {
        spinButton.setAlpha(1);
      }
    });

  betUpButton = this.add
    .text(0, 0, "▲", {
      fontSize: "28px",
      color: "#ffffff",
      backgroundColor: "#666",
      padding: { x: 5, y: 2 },
    })
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      currentBetIndex = (currentBetIndex + 1) % availableBets.length;
      currentBet = availableBets[currentBetIndex];
      updateUI();
    });

  betDownButton = this.add
    .text(0, 0, "▼", {
      fontSize: "28px",
      color: "#ffffff",
      backgroundColor: "#666",
      padding: { x: 5, y: 2 },
    })
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      currentBetIndex =
        (currentBetIndex - 1 + availableBets.length) % availableBets.length;
      currentBet = availableBets[currentBetIndex];
      updateUI();
    });

  settingsButton = this.add
    .text(0, 0, "\u2699", {
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#666",
      padding: { x: 5, y: 2 },
    })
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      if (settingsContainer) {
        closeSettings.call(this);
      } else {
        openSettings.call(this);
      }
    });

  uiContainer = this.add.container(0, 0, [
    balanceText,
    spinButton,
    betText,
    betUpButton,
    betDownButton,
    settingsButton,
  ]);

  updateUI();
  resizeUI.call(this, this.scale.gameSize);
  layoutGame.call(this, this.scale.gameSize);
  this.scale.on("resize", (gameSize) => {
    resizeUI.call(this, gameSize);
    layoutGame.call(this, gameSize);
  });
}

function updateUI() {
  if (!balanceText || !betText) {
    return;
  }
  balanceText.setText(
    `${currency.symbol} ${(balance / currency.subunits).toFixed(currency.exponent)}`,
  );
  betText.setText(
    `${currency.symbol} ${(currentBet / currency.subunits).toFixed(currency.exponent)}`,
  );
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
  if (spinButton) {
    spinButton.disableInteractive();
    spinButton.setAlpha(0.5);
  }

  // correct screen columns vs rows
  finalScreen = [[], [], []];
  result.outcome.screen.forEach((column, colid) =>
    column.map((data, row) => {
      if (!Array.isArray(finalScreen[row])) finalScreen[row] = [];
      finalScreen[row][colid] = data;
    }),
  );

  balance = `${result.balance.wallet}`;

  for (let c = 0; c < cols; c++) {
    const reel = reels[c];
    const lastCol = currentScreen.map((row) => row[c]);
    const finalCol = finalScreen.map((row) => row[c]);
    const delay = (c * 300 + 1000) * (settings.quickSpin ? 0.5 : 1);
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
    const delay = (i * 300 + 1000) * (settings.quickSpin ? 0.5 : 1);
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
      if (sprite.y >= centerY + SYMBOL_SPACING) {
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
    if (spinButton) {
      spinButton.setAlpha(1);
      spinButton.setInteractive({ useHandCursor: true });
    }
    if (finalScreen) {
      currentScreen = finalScreen.map((row) => [...row]);
      finalScreen = null;
    }
    if (lastResult && lastResult.outcome.win > 0) {
      highlightWin.call(this, lastResult.outcome, lastResult.features);
    } else {
      clearWin();
    }
    updateUI();
    lastResult = null;
  }
}

function alignReel(reel, col) {
  if (settings.sound) {
    this.sound.play("reelStop");
  }
  reel.sprites.sort((a, b) => a.y - b.y);
  for (let i = 0; i < reel.sprites.length; i++) {
    const sprite = reel.sprites[i];
    const targetY = centerY - SYMBOL_SPACING + i * SYMBOL_SPACING;
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
}

function highlightWin(outcome, features) {
  if (!winLine || !winText) {
    return;
  }
  clearWin();
  if (outcome.wins && outcome.wins.length > 0) {
    for (const winData of outcome.wins) {
      const [winType, multiplier, line] = winData;
      switch (winType) {
        case "scatter":
          // this is the large win bonus thingy; data is available in features and looks like..
          // {
          //     "bonus_data": {
          //         "bonus_multiplier": 53,
          //         "scatters_multiplier": 1,
          //         "scatters_count": 3,
          //         "multiplier": 53
          //     }
          // }
          console.log("Big win!!", features);
          break;
        case "line":
          winLine.lineStyle(6, 0xff0000, 1);
          winLine.beginPath();
          for (let c = 0; c < line.length; c++) {
            const row = line[c];
            const x = startX + c * REEL_WIDTH;
            const y = centerY + (row - (rows - 1) / 2) * SYMBOL_SPACING;
            if (c === 0) {
              winLine.moveTo(x, y);
            } else {
              winLine.lineTo(x, y);
            }
          }
          winLine.strokePath();
          break;
      }
    }
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

function resizeUI(gameSize) {
  if (!spinButton || !balanceText || !betText || !settingsButton) {
    return;
  }
  const width = gameSize.width;
  const height = gameSize.height;
  const margin = 20;
  if (width > height) {
    const right = settings.rightHand;
    const x = right ? width - margin : margin;
    spinButton.setOrigin(right ? 1 : 0, 0.5);
    balanceText.setOrigin(right ? 1 : 0, 0);
    betText.setOrigin(right ? 1 : 0, 1);
    betUpButton.setOrigin(right ? 1 : 0, 1);
    betDownButton.setOrigin(right ? 1 : 0, 1);
    settingsButton.setOrigin(right ? 1 : 0, 0);

    spinButton.setPosition(x, height / 2);
    settingsButton.setPosition(x, margin);
    balanceText.setPosition(x, margin + settingsButton.height + 5);
    betDownButton.setPosition(x, height - margin);
    betUpButton.setPosition(x, height - margin - betDownButton.height);
    if (right) {
      betText.setPosition(x - betDownButton.width - 5, height - margin);
    } else {
      betText.setPosition(x + betDownButton.width + 5, height - margin);
    }
  } else {
    const bottom = height - margin;
    spinButton.setOrigin(0.5, 1);
    balanceText.setOrigin(0, 1);
    betText.setOrigin(0, 1);
    betUpButton.setOrigin(0, 1);
    betDownButton.setOrigin(0, 1);
    settingsButton.setOrigin(settings.rightHand ? 1 : 0, 0);

    spinButton.setPosition(width / 2, bottom);
    balanceText.setPosition(margin, bottom);
    const betX = width - margin - betText.width - betUpButton.width - 5;
    betText.setPosition(betX, bottom);
    betUpButton.setPosition(
      betX + betText.width + 5,
      bottom - betUpButton.height,
    );
    betDownButton.setPosition(betX + betText.width + 5, bottom);
    const settingsX = settings.rightHand ? width - margin : margin;
    settingsButton.setPosition(settingsX, margin);
  }
}

function layoutGame(gameSize) {
  if (!reels.length) {
    return;
  }
  const width = gameSize.width;
  const height = gameSize.height;
  const margin = 20;
  if (width > height) {
    // landscape - leave room for UI on side
    spriteScale = 0.25;
    const uiWidth =
      Math.max(
        spinButton.width,
        betText.width + betUpButton.width + 5,
        balanceText.width,
      ) +
      margin * 2;
    const availableWidth = width - uiWidth;
    centerY = height / 2;
    const offsetX = settings.rightHand ? 0 : uiWidth;
    startX = offsetX + (availableWidth - (cols - 1) * REEL_WIDTH) / 2;
  } else {
    spriteScale = 0.3;
    const uiHeight = spinButton ? spinButton.height + margin : 80;
    centerY = (height - uiHeight) / 2;
    startX = width / 2 - ((cols - 1) * REEL_WIDTH) / 2;
  }
  for (let c = 0; c < reels.length; c++) {
    const reel = reels[c];
    const x = startX + c * REEL_WIDTH;
    for (let r = 0; r < reel.sprites.length; r++) {
      const sprite = reel.sprites[r];
      const y = centerY + (r - (rows - 1) / 2) * SYMBOL_SPACING;
      sprite.setPosition(x, y);
      sprite.setScale(spriteScale);
    }
  }
  if (winText) {
    const reelsCenter = startX + ((cols - 1) * REEL_WIDTH) / 2;
    winText.setPosition(reelsCenter, 80);
  }
  if (winLine) {
    winLine.clear();
  }
}

function openSettings() {
  if (settingsContainer) {
    return;
  }
  const { width, height } = this.cameras.main;
  settingsContainer = this.add.container(0, 0);
  const bg = this.add
    .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    .setInteractive();

  const panel = this.add.container(width / 2, height / 2);
  const panelBg = this.add
    .rectangle(0, 0, 300, 280, 0x222222, 0.9)
    .setOrigin(0.5);
  const style = { fontSize: "24px", color: "#ffffff", fontFamily: "Arial" };

  const quickText = this.add
    .text(0, -100, `Quick Spin: ${settings.quickSpin ? "ON" : "OFF"}`, style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.quickSpin = !settings.quickSpin;
      quickText.setText(`Quick Spin: ${settings.quickSpin ? "ON" : "OFF"}`);
    });

  const handText = this.add
    .text(0, -50, `Hand: ${settings.rightHand ? "RIGHT" : "LEFT"}`, style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.rightHand = !settings.rightHand;
      handText.setText(`Hand: ${settings.rightHand ? "RIGHT" : "LEFT"}`);
      resizeUI.call(this, this.scale.gameSize);
    });

  const musicText = this.add
    .text(0, 0, `Music: ${settings.music ? "ON" : "OFF"}`, style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.music = !settings.music;
      musicText.setText(`Music: ${settings.music ? "ON" : "OFF"}`);
      if (settings.music) {
        bgMusic.play();
      } else {
        bgMusic.stop();
      }
    });

  const soundText = this.add
    .text(0, 50, `Sound FX: ${settings.sound ? "ON" : "OFF"}`, style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.sound = !settings.sound;
      soundText.setText(`Sound FX: ${settings.sound ? "ON" : "OFF"}`);
    });

  const volumeText = this.add
    .text(0, 100, `Volume: ${Math.round(settings.volume * 100)}%`, style)
    .setOrigin(0.5);
  const volDown = this.add
    .text(-40, 140, "-", style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.volume = Math.max(0, Math.round((settings.volume - 0.1) * 10) / 10);
      this.sound.volume = settings.volume;
      if (bgMusic) {
        bgMusic.setVolume(settings.volume);
      }
      volumeText.setText(`Volume: ${Math.round(settings.volume * 100)}%`);
    });
  const volUp = this.add
    .text(40, 140, "+", style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.volume = Math.min(1, Math.round((settings.volume + 0.1) * 10) / 10);
      this.sound.volume = settings.volume;
      if (bgMusic) {
        bgMusic.setVolume(settings.volume);
      }
      volumeText.setText(`Volume: ${Math.round(settings.volume * 100)}%`);
    });

  const closeBtn = this.add
    .text(0, 190, "Close", { fontSize: "28px", color: "#ffffff", backgroundColor: "#444", padding: { x: 10, y: 5 } })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      closeSettings.call(this);
    });

  panel.add([panelBg, quickText, handText, musicText, soundText, volumeText, volDown, volUp, closeBtn]);
  settingsContainer.add([bg, panel]);
}

function closeSettings() {
  if (settingsContainer) {
    settingsContainer.destroy(true);
    settingsContainer = null;
  }
}
