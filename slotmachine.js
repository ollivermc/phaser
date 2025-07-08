import { init as apiInit, spin as apiSpin } from "./api.js";

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
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
  dom: {
    createContainer: true,
    pointerEvents: 'auto',
  },
};

// Base dimensions used for scaling UI elements
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const REEL_WIDTH = 200;
const SYMBOL_SPACING = 200;
let scaledReelWidth = REEL_WIDTH;
let scaledSymbolSpacing = SYMBOL_SPACING;
let startX = 200;
let centerY = 300;
const SPIN_SPEED = 2400;
const DECELERATION = 60000;
// Extra vertical offset applied to the spin button group in landscape mode
// so it sits closer to the bottom of the screen.
const SPIN_BUTTON_OFFSET = 120;

// Game settings with defaults
const settings = {
  quickSpin: false,
  rightHand: true,
  music: true,
  sound: true,
  volume: 1,
};

const SETTINGS_KEY = "slotmachine_settings";

function loadSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      Object.assign(settings, parsed);
    }
  } catch (e) {
    console.warn("Failed to load settings", e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save settings", e);
  }
}

loadSettings();

let settingsButton;
let settingsContainer;
let bgMusic;
let infoButton;
let infoContainer;
let paytable = {};
let linesData = [];

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
let betButton;
let spinButton;
let autoSpinButton;
let autoSpin = false;
let autoSpinCount = 0;
let autoSpinMenuContainer;
let betMenuContainer;
let autoSpinAdvancedMenuContainer;
let autoStopOnAnyWin = false;
let autoStopWinExceeds = 0;
let autoStopBalanceIncrease = 0;
let autoStopBalanceDecrease = 0;
let autoStopWinExceedsEnabled = false;
let autoStopBalanceIncreaseEnabled = false;
let autoStopBalanceDecreaseEnabled = false;
let autoSpinStartBalance = 0;

let finalScreen = null;
let rows = 0;
let cols = 0;
let baseReels = [];
let currentScreen = [];
let uiContainer;
let logoImage;
const game = new Phaser.Game(config);

function resizeGame() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const container = document.getElementById("canvas-container");
  if (container) {
    container.style.width = width + "px";
    container.style.height = height + "px";
  }
  if (game && game.scale) {
    game.scale.resize(width, height);
    game.scale.refresh();
  }
}

function handleResize() {
  setTimeout(resizeGame, 100);
}

window.addEventListener("resize", handleResize);
window.addEventListener("orientationchange", handleResize);

resizeGame();

let balance;
let currency;
let lastResult = null;
let winLine;
let winText;
const offset = 100;
let spriteScale = 0.3;

export function formatCurrency(amount) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
    currencyDisplay: "symbol",
    minimumFractionDigits: currency.exponent,
    maximumFractionDigits: currency.exponent,
  }).format(amount / currency.subunits);

  return formattedAmount;
}

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

  this.load.image("spin", "assets/ui/spin.png");
  this.load.image("skateboard", "assets/symbols/sliced_skate_image_1.png");
  this.load.image("skate", "assets/symbols/sliced_skate_image_2.png");
  this.load.image("helmet", "assets/symbols/sliced_skate_image_3.png");
  this.load.image("tools", "assets/symbols/sliced_skate_image_4.png");
  this.load.image("shoe", "assets/symbols/sliced_skate_image_new_1.png");
  this.load.image("wheel", "assets/symbols/sliced_skate_image_new_2.png");
  this.load.image("can", "assets/symbols/sliced_skate_image_new_3.png");
  this.load.image("badge", "assets/symbols/sliced_skate_image_new_4.png");
  this.load.image("bonus_skateboard", "assets/symbols/scatter_image_1.png");
  this.load.image("scatter_screamer", "assets/symbols/scatter_image_2.png");
  this.load.image("scatter_badge", "assets/symbols/scatter_image_3.png");
  this.load.image("bonus_helmet", "assets/symbols/scatter_image_4.png");
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
    const sprite = this.add.image(x, y, key).setScale(0.2);
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
  paytable = initData.options.paytable || initData.options.paytables || {};
  linesData = initData.options.lines || [];

  // start background music if enabled
  if (!bgMusic) {
    bgMusic = this.sound.add("bgMusic", {
      loop: true,
      volume: settings.volume,
    });
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
    const x = startX + c * scaledReelWidth;
    for (let r = 0; r < rows; r++) {
      const id = currentScreen[r][c];
      const y = centerY + (r - (rows - 1) / 2) * scaledSymbolSpacing;
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

  betButton = this.add
    .text(0, 0, "", {
      fontSize: "36px",
      color: "#ffffff",
      backgroundColor: "#444",
      padding: { x: 10, y: 5 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      if (betMenuContainer) {
        closeBetMenu.call(this);
      } else {
        openBetMenu.call(this);
      }
    });

  spinButton = this.add
    .image(0, 0, "spin")
    .setScale(0.2)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      if (autoSpin && autoSpinCount !== 0) {
        autoSpin = false;
        autoSpinCount = 0;
        updateAutoSpinButton();
      } else {
        startSpin(this);
      }
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


  autoSpinButton = this.add
    .text(0, 0, "AUTO OFF", {
      fontSize: "36px",
      color: "#ffffff",
      backgroundColor: "#444",
      padding: { x: 10, y: 5 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      if (autoSpinMenuContainer) {
        closeAutoSpinMenu.call(this);
      } else {
        openAutoSpinMenu.call(this);
      }
    });
  updateAutoSpinButton();

  settingsButton = this.add
    .text(0, 0, "\u2699", {
      fontSize: "80px",
      color: "#888888",
    })
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      if (settingsContainer) {
        closeSettings.call(this);
      } else {
        openSettings.call(this);
      }
    });

  infoButton = this.add
    .text(0, 0, "\u2139", {
      fontSize: "80px",
      color: "#888888",
    })
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      if (infoContainer) {
        closeInfo.call(this);
      } else {
        openInfo.call(this);
      }
    });

  uiContainer = this.add.container(0, 0, [
    balanceText,
    autoSpinButton,
    spinButton,
    betButton,
    settingsButton,
    infoButton,
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
  if (!balanceText || !betButton) {
    return;
  }
  balanceText.setText(`${formatCurrency(balance)}`);
  betButton.setText(`${formatCurrency(currentBet)}`);
}

function updateAutoSpinButton() {
  if (autoSpinButton) {
    if (autoSpin && autoSpinCount !== 0) {
      const label =
        autoSpinCount === Infinity ? "∞" : `${autoSpinCount}`;
      autoSpinButton.setText(`AUTO ${label}`);
    } else {
      autoSpinButton.setText("AUTO OFF");
    }
  }
}


function startSpin(scene) {
  if (isSpinning) {
    return;
  }
  if (spinButton) {
    if (!autoSpin) {
      spinButton.disableInteractive();
      spinButton.setAlpha(0.5);
    } else {
      spinButton.setAlpha(1);
    }
  }
  apiSpin(currentBet).then((result) => spin.call(scene, result));
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
    if (!autoSpin) {
      spinButton.disableInteractive();
      spinButton.setAlpha(0.5);
    } else {
      spinButton.setAlpha(1);
    }
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
      Math.round(travel / (scaledSymbolSpacing * rows)),
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
      if (sprite.y >= centerY + scaledSymbolSpacing) {
        sprite.y -= scaledSymbolSpacing * reel.sprites.length;
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
    const winAmountCheck = lastResult ? lastResult.outcome.win : 0;
    updateUI();
    lastResult = null;
    if (autoSpin && autoSpinCount !== 0) {
      const winAmount = winAmountCheck;
      const bal = Number(balance);
      let stop = false;
      if (autoStopOnAnyWin && winAmount > 0) {
        stop = true;
      }
      if (
        !stop &&
        autoStopWinExceedsEnabled &&
        autoStopWinExceeds > 0 &&
        winAmount >= autoStopWinExceeds
      ) {
        stop = true;
      }
      if (
        !stop &&
        autoStopBalanceIncreaseEnabled &&
        autoStopBalanceIncrease > 0 &&
        bal - autoSpinStartBalance >= autoStopBalanceIncrease
      ) {
        stop = true;
      }
      if (
        !stop &&
        autoStopBalanceDecreaseEnabled &&
        autoStopBalanceDecrease > 0 &&
        autoSpinStartBalance - bal >= autoStopBalanceDecrease
      ) {
        stop = true;
      }
      if (!stop) {
        if (autoSpinCount !== Infinity) {
          autoSpinCount--;
        }
        if (autoSpinCount === 0) {
          stop = true;
        }
      }
      if (stop) {
        autoSpin = false;
        autoSpinCount = 0;
        updateAutoSpinButton();
      } else {
        updateAutoSpinButton();
        this.time.delayedCall(500, () => {
          if (autoSpin && !isSpinning) {
            startSpin(this);
          }
        });
      }
    }
  }
}

function alignReel(reel, col) {
  if (settings.sound) {
    this.sound.play("reelStop");
  }
  reel.sprites.sort((a, b) => a.y - b.y);
  for (let i = 0; i < reel.sprites.length; i++) {
    const sprite = reel.sprites[i];
    const targetY = centerY - scaledSymbolSpacing + i * scaledSymbolSpacing;
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
            const x = startX + c * scaledReelWidth;
            const y = centerY + (row - (rows - 1) / 2) * scaledSymbolSpacing;
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
  const amount = outcome.win;
  winText.setText(`WIN ${formatCurrency(amount)}`);
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
  if (
    !spinButton ||
    !balanceText ||
    !betButton ||
    !autoSpinButton ||
    !settingsButton ||
    !infoButton
  ) {
    return;
  }
  const width = gameSize.width;
  const height = gameSize.height;
  const margin = 20;
  const scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  if (width > height) {
    const right = settings.rightHand;
    const uiX = right ? width - margin : margin;
    const settingsX = right ? margin : width - margin;
    const infoX = right ? width - margin : margin;
    spinButton.setOrigin(right ? 1 : 0, 0.5);
    autoSpinButton.setOrigin(right ? 1 : 0, 0.5);
    betButton.setOrigin(right ? 1 : 0, 0.5);
    // Position balance in bottom-left corner for landscape layout
    balanceText.setOrigin(0, 1);
    settingsButton.setOrigin(right ? 0 : 1, 0);
    infoButton.setOrigin(right ? 1 : 0, 0);

    autoSpinButton.setFontSize(28 * scaleFactor);
    betButton.setFontSize(28 * scaleFactor);
    balanceText.setFontSize(28 * scaleFactor);
    infoButton.setFontSize(48 * scaleFactor);

    const spacing =
      Math.max(spinButton.displayHeight, autoSpinButton.height, betButton.height) +
      margin;
    const centerY = height / 2 + SPIN_BUTTON_OFFSET;
    spinButton.setPosition(uiX, centerY);
    autoSpinButton.setPosition(uiX, centerY - spacing);
    betButton.setPosition(uiX, centerY + spacing);
    const balanceX = margin;
    const balanceY = height - margin;
    balanceText.setPosition(balanceX, balanceY);
    settingsButton.setPosition(settingsX, margin);
    infoButton.setPosition(infoX, margin);
  } else {
    const bottom = height - margin;
    spinButton.setOrigin(0.5, 1);
    autoSpinButton.setOrigin(0.5, 1);
    betButton.setOrigin(0.5, 1);
    balanceText.setOrigin(0, 1);
    settingsButton.setOrigin(settings.rightHand ? 0 : 1, 0);
    infoButton.setOrigin(settings.rightHand ? 1 : 0, 0);

    autoSpinButton.setFontSize(40 * scaleFactor);
    betButton.setFontSize(40 * scaleFactor);
    balanceText.setFontSize(40 * scaleFactor);
    infoButton.setFontSize(72 * scaleFactor);

    const totalWidth =
      autoSpinButton.width + spinButton.displayWidth + betButton.width;
    const gap = (width - 2 * margin - totalWidth) / 4;
    let x = margin + gap + autoSpinButton.width / 2;
    autoSpinButton.setPosition(x, bottom);
    x += autoSpinButton.width / 2 + gap + spinButton.displayWidth / 2;
    spinButton.setPosition(x, bottom);
    x += spinButton.displayWidth / 2 + gap + betButton.width / 2;
    betButton.setPosition(x, bottom);
    const balanceOffset = 80;
    balanceText.setPosition(margin, bottom - balanceOffset);
    const settingsX = settings.rightHand ? margin : width - margin;
    const infoX = settings.rightHand ? width - margin : margin;
    settingsButton.setPosition(settingsX, margin);
    infoButton.setOrigin(settings.rightHand ? 1 : 0, 0);
    infoButton.setPosition(infoX, margin);
  }
}

function layoutGame(gameSize) {
  if (!reels.length) {
    return;
  }
  const width = gameSize.width;
  const height = gameSize.height;
  const margin = 20;
  const scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  scaledReelWidth = REEL_WIDTH * scaleFactor;
  scaledSymbolSpacing = SYMBOL_SPACING * scaleFactor;
  if (width > height) {
    // landscape - leave room for UI on side
    spriteScale = 0.25 * scaleFactor;
    const uiWidth =
      Math.max(
        spinButton.displayWidth,
        autoSpinButton.width,
        betButton.width,
        balanceText.width,
        settingsButton.width,
        infoButton.width,
      ) +
      margin * 2;
    const availableWidth = width - uiWidth;
    centerY = height / 2;
    const offsetX = settings.rightHand ? 0 : uiWidth;
    startX = offsetX + (availableWidth - (cols - 1) * scaledReelWidth) / 2;
  } else {
    spriteScale = 0.3 * scaleFactor;
    const uiHeight = spinButton
      ? Math.max(
          spinButton.displayHeight,
          autoSpinButton.height,
          betButton.height,
          settingsButton.height,
          infoButton.height,
        ) +
        margin * 2
      : 80;
    centerY = (height - uiHeight) / 2;
    startX = width / 2 - ((cols - 1) * scaledReelWidth) / 2;
  }
  for (let c = 0; c < reels.length; c++) {
    const reel = reels[c];
    const x = startX + c * scaledReelWidth;
    for (let r = 0; r < reel.sprites.length; r++) {
      const sprite = reel.sprites[r];
      const y = centerY + (r - (rows - 1) / 2) * scaledSymbolSpacing;
      sprite.setPosition(x, y);
      sprite.setScale(spriteScale);
    }
  }
  if (winText) {
    const reelsCenter = startX + ((cols - 1) * scaledReelWidth) / 2;
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

  const panelWidth = 300;
  const panelHeight = 360;
  const panel = this.add.container(width / 2, height / 2);
  const panelBg = this.add
    .rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.9)
    .setOrigin(0.5);
  const style = { fontSize: "24px", color: "#ffffff", fontFamily: "Arial" };

  const quickText = this.add
    .text(0, -100, `Quick Spin: ${settings.quickSpin ? "ON" : "OFF"}`, style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.quickSpin = !settings.quickSpin;
      quickText.setText(`Quick Spin: ${settings.quickSpin ? "ON" : "OFF"}`);
      saveSettings();
    });

  const handText = this.add
    .text(0, -50, `Hand: ${settings.rightHand ? "RIGHT" : "LEFT"}`, style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.rightHand = !settings.rightHand;
      handText.setText(`Hand: ${settings.rightHand ? "RIGHT" : "LEFT"}`);
      saveSettings();
      resizeUI.call(this, this.scale.gameSize);
      layoutGame.call(this, this.scale.gameSize);
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
      saveSettings();
    });

  const soundText = this.add
    .text(0, 50, `Sound FX: ${settings.sound ? "ON" : "OFF"}`, style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.sound = !settings.sound;
      soundText.setText(`Sound FX: ${settings.sound ? "ON" : "OFF"}`);
      saveSettings();
    });

  const volumeText = this.add
    .text(0, 100, `Volume: ${Math.round(settings.volume * 100)}%`, style)
    .setOrigin(0.5);
  const volDown = this.add
    .text(-40, 140, "-", style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.volume = Math.max(
        0,
        Math.round((settings.volume - 0.1) * 10) / 10,
      );
      this.sound.volume = settings.volume;
      if (bgMusic) {
        bgMusic.setVolume(settings.volume);
      }
      volumeText.setText(`Volume: ${Math.round(settings.volume * 100)}%`);
      saveSettings();
    });
  const volUp = this.add
    .text(40, 140, "+", style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      settings.volume = Math.min(
        1,
        Math.round((settings.volume + 0.1) * 10) / 10,
      );
      this.sound.volume = settings.volume;
      if (bgMusic) {
        bgMusic.setVolume(settings.volume);
      }
      volumeText.setText(`Volume: ${Math.round(settings.volume * 100)}%`);
      saveSettings();
    });

  const closeBtn = this.add
    .text(0, panelHeight / 2 - 30, "Close", {
      fontSize: "28px",
      color: "#ffffff",
      backgroundColor: "#444",
      padding: { x: 10, y: 5 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      closeSettings.call(this);
    });

  panel.add([
    panelBg,
    quickText,
    handText,
    musicText,
    soundText,
    volumeText,
    volDown,
    volUp,
    closeBtn,
  ]);
  settingsContainer.add([bg, panel]);
}

function closeSettings() {
  if (settingsContainer) {
    settingsContainer.destroy(true);
    settingsContainer = null;
  }
}

function openBetMenu() {
  if (betMenuContainer) {
    return;
  }
  const { width, height } = this.cameras.main;
  betMenuContainer = this.add.container(0, 0);
  const bg = this.add
    .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    .setInteractive()
    .on("pointerdown", () => {
      closeBetMenu.call(this);
    });

  const panel = this.add.container(width / 2, height / 2);
  const cols = 3;
  const spacing = 10;
  const buttonWidth = 100;
  const buttonHeight = 40;
  const rowsCount = Math.ceil(availableBets.length / cols);
  const panelWidth = cols * buttonWidth + (cols - 1) * spacing + spacing * 2;
  const panelHeight =
    rowsCount * buttonHeight + (rowsCount - 1) * spacing + spacing * 2;

  const panelBg = this.add
    .rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.9)
    .setOrigin(0.5);

  panel.add(panelBg);
  const style = {
    fontSize: "24px",
    color: "#ffffff",
    backgroundColor: "#444",
    padding: { x: 10, y: 5 },
    fontFamily: "Arial",
  };

  availableBets.forEach((bet, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x =
      -panelWidth / 2 +
      spacing +
      col * (buttonWidth + spacing) +
      buttonWidth / 2;
    const y =
      -panelHeight / 2 +
      spacing +
      row * (buttonHeight + spacing) +
      buttonHeight / 2;
    const text = this.add
      .text(x, y, `${formatCurrency(bet)}`, style)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        currentBetIndex = idx;
        currentBet = bet;
        updateUI();
        closeBetMenu.call(this);
      });
    panel.add(text);
  });
  betMenuContainer.add([bg, panel]);
}

function closeBetMenu() {
  if (betMenuContainer) {
    betMenuContainer.destroy(true);
    betMenuContainer = null;
  }
}

function openAutoSpinMenu() {
  if (autoSpinMenuContainer) {
    return;
  }
  const { width, height } = this.cameras.main;
  autoSpinMenuContainer = this.add.container(0, 0);
  const bg = this.add
    .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    .setInteractive()
    .on("pointerdown", () => {
      closeAutoSpinMenu.call(this);
    });

  const options = [5, 20, 25, 50, 100, 200, 300, 400, 500, 1000, "∞"];
  const cols = 3;
  const spacing = 10;
  const buttonWidth = 90;
  const buttonHeight = 40;
  const rowsCount = Math.ceil(options.length / cols);
  const panelWidth = cols * buttonWidth + (cols - 1) * spacing + spacing * 2;
  const advHeight = 40;
  const panelHeight =
    rowsCount * buttonHeight +
    (rowsCount - 1) * spacing +
    spacing * 3 +
    advHeight;

  const panel = this.add.container(width / 2, height / 2);
  const panelBg = this.add
    .rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.9)
    .setOrigin(0.5);
  panel.add(panelBg);

  const style = {
    fontSize: "24px",
    color: "#ffffff",
    backgroundColor: "#444",
    padding: { x: 10, y: 5 },
    fontFamily: "Arial",
  };

  options.forEach((opt, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = -panelWidth / 2 + spacing + col * (buttonWidth + spacing) + buttonWidth / 2;
    const y = -panelHeight / 2 + spacing + row * (buttonHeight + spacing) + buttonHeight / 2;
    const label = `${opt}`;
    const text = this.add
      .text(x, y, label, style)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        autoSpinCount = opt === "∞" ? Infinity : parseInt(opt, 10);
        autoSpin = true;
        autoSpinStartBalance = Number(balance);
        updateAutoSpinButton();
        closeAutoSpinMenu.call(this);
        if (!isSpinning) {
          startSpin(this);
        }
      });
    panel.add(text);
  });

  const advButton = this.add
    .text(0, panelHeight / 2 - advHeight / 2 - spacing, "Advanced", style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      closeAutoSpinMenu.call(this);
      openAutoSpinAdvancedMenu.call(this);
    });
  panel.add(advButton);
  autoSpinMenuContainer.add([bg, panel]);
}

function closeAutoSpinMenu() {
  if (autoSpinMenuContainer) {
    autoSpinMenuContainer.destroy(true);
    autoSpinMenuContainer = null;
  }
  if (autoSpinAdvancedMenuContainer) {
    closeAutoSpinAdvancedMenu.call(this);
  }
}

function openAutoSpinAdvancedMenu() {
  if (autoSpinAdvancedMenuContainer) {
    return;
  }
  const { width, height } = this.cameras.main;
  autoSpinAdvancedMenuContainer = this.add.container(0, 0);
  const bg = this.add
    .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    .setInteractive()
    .on("pointerdown", () => {
      closeAutoSpinAdvancedMenu.call(this);
    });

  const panelWidth = 360;
  const panelHeight = 260;
  const panel = this.add.container(width / 2, height / 2);
  const panelBg = this.add
    .rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.9)
    .setOrigin(0.5);
  panel.add(panelBg);
  const blocker = this.add
    .rectangle(0, 0, panelWidth, panelHeight, 0x000000, 0)
    .setOrigin(0.5)
    .setInteractive()
    .on("pointerdown", (pointer, lx, ly, event) => {
      event.stopPropagation();
    });
  panel.add(blocker);

  const style = { fontSize: "24px", color: "#ffffff", fontFamily: "Arial" };

  const checkX = -panelWidth / 2 + 20;
  const labelX = checkX + 30;
  const inputX = panelWidth / 2 - 60;

  const anyWinCheck = this.add
    .dom(checkX, -90, "input")
    .setOrigin(0, 0.5);
  anyWinCheck.node.type = "checkbox";
  anyWinCheck.node.checked = autoStopOnAnyWin;
  const anyWinLabel = this.add
    .text(labelX, -90, "Stop on any win", style)
    .setOrigin(0, 0.5);
  panel.add([anyWinCheck, anyWinLabel]);

  const winCheck = this.add
    .dom(checkX, -40, "input")
    .setOrigin(0, 0.5);
  winCheck.node.type = "checkbox";
  winCheck.node.checked = autoStopWinExceedsEnabled;
  const winLabel = this.add
    .text(labelX, -40, "Win exceeds", style)
    .setOrigin(0, 0.5);
  const winInput = this.add
    .dom(inputX, -40, "input", "width: 100px")
    .setOrigin(0.5);
  winInput.node.type = "number";
  winInput.node.value = autoStopWinExceeds || "";
  panel.add([winCheck, winLabel, winInput]);

  const incCheck = this.add
    .dom(checkX, 10, "input")
    .setOrigin(0, 0.5);
  incCheck.node.type = "checkbox";
  incCheck.node.checked = autoStopBalanceIncreaseEnabled;
  const incLabel = this.add
    .text(labelX, 10, "Balance +", style)
    .setOrigin(0, 0.5);
  const incInput = this.add
    .dom(inputX, 10, "input", "width: 100px")
    .setOrigin(0.5);
  incInput.node.type = "number";
  incInput.node.value = autoStopBalanceIncrease || "";
  panel.add([incCheck, incLabel, incInput]);

  const decCheck = this.add
    .dom(checkX, 60, "input")
    .setOrigin(0, 0.5);
  decCheck.node.type = "checkbox";
  decCheck.node.checked = autoStopBalanceDecreaseEnabled;
  const decLabel = this.add
    .text(labelX, 60, "Balance -", style)
    .setOrigin(0, 0.5);
  const decInput = this.add
    .dom(inputX, 60, "input", "width: 100px")
    .setOrigin(0.5);
  decInput.node.type = "number";
  decInput.node.value = autoStopBalanceDecrease || "";
  panel.add([decCheck, decLabel, decInput]);

  const okButton = this.add
    .text(0, panelHeight / 2 - 30, "OK", {
      fontSize: "24px",
      color: "#ffffff",
      backgroundColor: "#444",
      padding: { x: 10, y: 5 },
      fontFamily: "Arial",
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      autoStopOnAnyWin = anyWinCheck.node.checked;
      autoStopWinExceedsEnabled = winCheck.node.checked;
      autoStopBalanceIncreaseEnabled = incCheck.node.checked;
      autoStopBalanceDecreaseEnabled = decCheck.node.checked;
      autoStopWinExceeds = parseFloat(winInput.node.value) || 0;
      autoStopBalanceIncrease = parseFloat(incInput.node.value) || 0;
      autoStopBalanceDecrease = parseFloat(decInput.node.value) || 0;
      closeAutoSpinAdvancedMenu.call(this);
    });
  panel.add(okButton);

  autoSpinAdvancedMenuContainer.add([bg, panel]);
}

function closeAutoSpinAdvancedMenu() {
  if (autoSpinAdvancedMenuContainer) {
    autoSpinAdvancedMenuContainer.destroy(true);
    autoSpinAdvancedMenuContainer = null;
  }
}

function openInfo() {
  if (infoContainer) {
    return;
  }
  const { width, height } = this.cameras.main;
  infoContainer = this.add.container(0, 0);
  const bg = this.add
    .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    .setInteractive()
    .on("pointerdown", () => {
      closeInfo.call(this);
    });

  const panelWidth = 360;
  const panelHeight = 420;
  const panel = this.add.container(width / 2, height / 2);
  const panelBg = this.add
    .rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.9)
    .setOrigin(0.5);
  panel.add(panelBg);

  const paytablePage = this.add.container(0, 0);
  const linesPage = this.add.container(0, 0);
  const pages = [paytablePage, linesPage];
  let pageIndex = 0;

  const title = this.add
    .text(0, -panelHeight / 2 + 30, "INFO", {
      fontSize: "32px",
      color: "#ffffff",
      fontFamily: "Arial",
    })
    .setOrigin(0.5);
  paytablePage.add(title);

  const style = { fontSize: "24px", color: "#ffffff", fontFamily: "Arial" };
  const margin = 40;
  const entries = Object.keys(paytable);
  const cols = 2;
  const rowsCount = Math.ceil(entries.length / cols);
  const cellWidth = (panelWidth - margin * 2) / cols;
  const cellHeight = (panelHeight - margin * 2 - 100) / rowsCount;
  entries.forEach((key, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = -panelWidth / 2 + margin + cellWidth * col + cellWidth / 2;
    const y = -panelHeight / 2 + margin + 60 + cellHeight * row;
    const img = this.add
      .image(x - cellWidth / 6, y, symbolTextures[parseInt(key, 10)])
      .setScale(0.1);
    const payout = paytable[key][2];
    const text = this.add
      .text(x + cellWidth / 4, y, `x${payout}`, style)
      .setOrigin(0, 0.5);
    paytablePage.add(img);
    paytablePage.add(text);
  });

  const infoText = this.add
    .text(0, panelHeight / 2 - 80, "Match 3 symbols on a line to win.", {
      fontSize: "20px",
      color: "#ffffff",
      fontFamily: "Arial",
      align: "center",
      wordWrap: { width: panelWidth - 40 },
    })
    .setOrigin(0.5);
  paytablePage.add(infoText);

  // lines page setup
  const linesTitle = this.add
    .text(0, -panelHeight / 2 + 30, "LINES", {
      fontSize: "32px",
      color: "#ffffff",
      fontFamily: "Arial",
    })
    .setOrigin(0.5);
  linesPage.add(linesTitle);

  const boardSize = 100;
  const spacing = 20;
  const lineCols = 2;
  const lineRows = Math.ceil(linesData.length / lineCols);
  const startY = -panelHeight / 2 + 60;

  linesData.forEach((line, idx) => {
    const r = Math.floor(idx / lineCols);
    const c = idx % lineCols;
    const x = -panelWidth / 2 + spacing + c * (boardSize + spacing);
    const y = startY + r * (boardSize + spacing);

    const container = this.add.container(x, y);
    const bgBoard = this.add
      .rectangle(boardSize / 2, boardSize / 2, boardSize, boardSize, 0x888888, 1);
    const g = this.add.graphics();
    const cellW = boardSize / cols;
    const cellH = boardSize / rows;
    g.lineStyle(1, 0x333333, 1);
    for (let i = 1; i < cols; i++) {
      g.beginPath();
      g.moveTo(cellW * i, 0);
      g.lineTo(cellW * i, boardSize);
      g.strokePath();
    }
    for (let i = 1; i < rows; i++) {
      g.beginPath();
      g.moveTo(0, cellH * i);
      g.lineTo(boardSize, cellH * i);
      g.strokePath();
    }
    g.lineStyle(3, 0xff0000, 1);
    g.beginPath();
    line.forEach((rowIndex, idx2) => {
      const lx = cellW * idx2 + cellW / 2;
      const ly = cellH * rowIndex + cellH / 2;
      if (idx2 === 0) {
        g.moveTo(lx, ly);
      } else {
        g.lineTo(lx, ly);
      }
    });
    g.strokePath();
    container.add([bgBoard, g]);
    linesPage.add(container);
  });

  const closeBtn = this.add
    .text(0, panelHeight / 2 - 30, "Close", {
      fontSize: "28px",
      color: "#ffffff",
      backgroundColor: "#444",
      padding: { x: 10, y: 5 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      closeInfo.call(this);
    });

  const prevBtn = this.add
    .text(-panelWidth / 2 + 50, panelHeight / 2 - 30, "Prev", style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      showPage(pageIndex - 1);
    });

  const nextBtn = this.add
    .text(panelWidth / 2 - 50, panelHeight / 2 - 30, "Next", style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      showPage(pageIndex + 1);
    });

  panel.add([paytablePage, linesPage, closeBtn, prevBtn, nextBtn]);
  infoContainer.add([bg, panel]);

  function showPage(idx) {
    pageIndex = Phaser.Math.Clamp(idx, 0, pages.length - 1);
    pages.forEach((p, i) => p.setVisible(i === pageIndex));
    prevBtn.setVisible(pageIndex > 0);
    nextBtn.setVisible(pageIndex < pages.length - 1);
  }

  showPage(0);
}

function closeInfo() {
  if (infoContainer) {
    infoContainer.destroy(true);
    infoContainer = null;
  }
}
