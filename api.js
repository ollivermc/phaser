const state = {
  wallet: 100000.0,
  roundId: 1000,
};

export async function init() {
  return await sendRequest("init");
  // return initialize response here, this contains the game info etc.
  const payload = {
    command: "init",
  };
  console.log("api", payload);
  return {
    api_version: "2",
    balance: {
      game: 0,
      wallet: state.wallet,
    },
    flow: {
      available_actions: ["init", "spin"],
      command: "init",
      state: "ready",
    },
    options: {
      available_bets: [1, 5, 10, 20, 25, 50, 100, 200, 300, 400, 500, 1000],
      currency: {
        code: "FUN",
        exponent: 2,
        subunits: 100,
        symbol: "FUN",
      },
      default_bet: 1,
      feature_options: {
        disabled_features: [],
        feature_multipliers: {
          base_bet: 5,
          bonus_buy: 400,
        },
      },
      layout: {
        reels: 3,
        rows: 3,
      },
      lines: [
        [0, 0, 0],
        [1, 1, 1],
        [2, 2, 2],
        [0, 1, 2],
        [2, 1, 0],
      ],
      paytable: {
        0: [0, 0, 300],
        1: [0, 0, 200],
        2: [0, 0, 40],
        3: [0, 0, 20],
        4: [0, 0, 20],
        5: [0, 0, 20],
        6: [0, 0, 20],
        7: [0, 0, 5],
      },
      paytables: {
        0: {
          default: [0, 0, 300],
        },
        1: {
          default: [0, 0, 200],
        },
        2: {
          default: [0, 0, 40],
        },
        3: {
          default: [0, 0, 20],
        },
        4: {
          default: [0, 0, 20],
        },
        5: {
          default: [0, 0, 20],
        },
        6: {
          default: [0, 0, 20],
        },
        7: {
          default: [0, 0, 5],
        },
      },
      reels: {
        main: [
          [
            "1",
            "7",
            "7",
            "7",
            "7",
            "3",
            "2",
            "4",
            "4",
            "4",
            "4",
            "3",
            "3",
            "5",
            "5",
            "5",
            "5",
            "2",
            "2",
            "0",
            "6",
            "6",
            "6",
            "6",
            "7",
            "1",
            "7",
            "7",
            "7",
            "7",
            "3",
            "2",
            "4",
            "4",
            "4",
            "4",
            "3",
            "3",
            "5",
            "5",
            "5",
            "5",
            "2",
            "2",
            "0",
            "6",
            "6",
            "6",
            "6",
            "7",
            "7",
            "7",
            "7",
            "7",
          ],
          [
            "1",
            "3",
            "5",
            "3",
            "5",
            "5",
            "5",
            "2",
            "6",
            "2",
            "6",
            "6",
            "6",
            "6",
            "7",
            "0",
            "7",
            "7",
            "7",
            "3",
            "4",
            "3",
            "4",
            "4",
            "4",
            "1",
            "3",
            "5",
            "3",
            "5",
            "5",
            "5",
            "2",
            "6",
            "2",
            "6",
            "6",
            "6",
            "6",
            "7",
            "0",
            "7",
            "7",
            "7",
            "3",
            "4",
            "3",
            "4",
            "4",
            "4",
            "7",
            "7",
            "7",
            "7",
          ],
          [
            "1",
            "7",
            "7",
            "7",
            "7",
            "3",
            "3",
            "0",
            "4",
            "4",
            "4",
            "4",
            "3",
            "3",
            "5",
            "5",
            "5",
            "5",
            "2",
            "2",
            "6",
            "6",
            "6",
            "6",
            "7",
            "1",
            "7",
            "7",
            "7",
            "7",
            "3",
            "3",
            "0",
            "4",
            "4",
            "4",
            "4",
            "3",
            "3",
            "5",
            "5",
            "5",
            "5",
            "2",
            "2",
            "6",
            "6",
            "6",
            "6",
            "7",
            "7",
            "7",
            "7",
            "7",
          ],
        ],
      },
      screen: [
        ["1", "7", "7"],
        ["1", "3", "8"],
        ["1", "7", "7"],
      ],
      special_symbols: [
        {
          kind: "scatter",
          symbol: "8",
        },
      ],
    },
  };
}

function getOutcome(betAmount) {
  return {
    screen: [
      ["4", "7", "0"],
      ["4", "7", "0"],
      ["2", "7", "0"],
    ],
    special_symbols: {},
    bet: betAmount,
    win: betAmount * 61.0,
    wins: [
      ["line", 1.0, [1, 1, 1], 1],
      ["line", 60.0, [2, 2, 2], 2],
    ],
    storage: null,
  };

  return [
    {
      bet: betAmount,
      screen: [
        ["3", "4", "2"],
        ["0", "2", "2"],
        ["1", "6", "0"],
      ],
      special_symbols: {},
      storage: null,
      win: 0.0,
      wins: [],
    },
    {
      bet: betAmount,
      screen: [
        ["7", "0", "6"],
        ["7", "3", "7"],
        ["7", "1", "0"],
      ],
      special_symbols: {},
      storage: null,
      win: betAmount * 2.0,
      wins: [["line", 1.0, [0, 0, 0], 0]],
    },
    {
      bet: betAmount,
      screen: [
        ["3", "1", "7"],
        ["3", "7", "7"],
        ["7", "0", "6"],
      ],
      special_symbols: {},
      storage: null,
      win: betAmount * 2.0,
      wins: [["line", 1.0, [2, 1, 0], 0]],
    },
    {
      bet: betAmount,
      screen: [
        ["0", "3", "4"],
        ["6", "3", "6"],
        ["1", "0", "7"],
      ],
      special_symbols: {},
      storage: null,
      win: 0.0,
      wins: [],
    },
    {
      bet: 1,
      screen: [
        ["0", "8", "7"],
        ["6", "5", "6"],
        ["5", "2", "8"],
      ],
      special_symbols: {
        scatter: {
          8: [
            [0, 1],
            [2, 2],
          ],
        },
      },
      storage: null,
      win: 0.0,
      wins: [],
    },
  ][Math.floor(Math.random() * 4)];
}

export async function spin(betAmount) {
  // real api
  return await sendRequest("spin", {
    bet: betAmount, // example response is based on bet amount of 1,
  });

  const payload = {
    command: "spin",
    options: {
      bet: betAmount, // example response is based on bet amount of 1,
    },
  };
  console.log("api", payload);
  const outcome = getOutcome(betAmount);
  return {
    api_version: "2",
    balance: {
      game: 0.0,
      wallet: (state.wallet = state.wallet + outcome.win - betAmount),
    },
    flow: {
      available_actions: ["init", "spin"],
      command: "spin",
      state: "closed",
    },
    outcome,
  };
}

const game = "Chipy";

export async function sendRequest(command, options) {
  const body = JSON.stringify({ command, options });
  const response = await fetch(
    `https://c8b313dee6305bc89d9ea189d17121c7.0x6e.com/game/slots/${game}`,
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        "X-Csrf-Token": "test-test",
      },
      body,
      method: "POST",
    },
  );
  const data = await response.json();
  console.log(data);
  return data;
}
