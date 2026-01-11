const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log("🟢 Servidor WebSocket iniciado en puerto", PORT);

// ===== CONFIG =====
const MAX_PLAYERS = 5;
const MATCH_TIMEOUT = 10 * 1000;

let queue = [];
let matchTimer = null;

// ===== PALABRAS =====
const WORD_PAIRS = [
  ["GATO", "PERRO"],
  ["PLAYA", "PISCINA"],
  ["PIZZA", "HAMBURGUESA"],
  ["COCA", "PEPSI"],
  ["FUEGO", "HIELO"],
  ["MESSI", "RONALDO"],
  ["BOLIVIA", "MAR"],
  ["VENEZUELA", "MADURO"],
  ["ARGENTINA", "INFLACIÓN"],
  ["CHILE", "TERREMOTO"],

  ["LA COBRA", "BUEEE"],
  ["SPREEN", "MICTIA"],
  ["DAVO", "ES COMO UN MUNDIAL PERO DE CLUBES"],
  ["IBAI", "VELADA"],
  ["AURONPLAY", "BROMA"],

  ["SILLA", "MESA"],
  ["CUCHARA", "TENEDOR"],
  ["ZAPATO", "PANTUFLA"],
  ["MOCHILA", "MALETA"],
  ["CUADERNO", "LIBRO"],

  ["PIZZA", "EMPANADA"],
  ["SALCHIPAPA", "PAPAS FRITAS"],
  ["HELADO", "HIELO"],
  ["PAN", "MARRAQUETA"],
  ["ARROZ", "FIDEO"],

  ["BATMAN", "SUPERMAN"],
  ["SPIDERMAN", "HOMBRE ARAÑA"],
  ["GOKU", "VEGETA"],
  ["NARUTO", "SASUKE"],
  ["THANOS", "GUANTE"],

  ["WIFI", "DATOS"],
  ["ERROR", "BUG"],
  ["HACKEAR", "COPIAR"],
  ["LIKE", "FOLLOW"],
  ["CRINGE", "PENA AJENA"],

  ["EXAMEN", "PRUEBA"],
  ["TAREA", "CASTIGO"],
  ["RECREO", "DESCANSO"],
  ["PROFESOR", "PROFE"],
  ["APROBADO", "JALADO"]
];

// ===== CONNECTION =====
wss.on("connection", (ws) => {
  console.log("🔵 Jugador conectado");

  ws.on("message", () => {
    if (!queue.includes(ws)) {
      queue.push(ws);
      broadcastCount();

      if (queue.length === 1) startMatchTimer();
    }

    if (queue.length === MAX_PLAYERS) {
      clearMatchTimer();
      startGame();
    }
  });

  ws.on("close", () => {
    queue = queue.filter((p) => p !== ws);
    broadcastCount();
  });
});

// ===== FUNCIONES =====

function startMatchTimer() {
  if (matchTimer) return;

  matchTimer = setTimeout(() => {
    console.log("⏰ Tiempo agotado, rellenando con bots");
    fillWithBots();
    startGame();
  }, MATCH_TIMEOUT);
}

function clearMatchTimer() {
  if (matchTimer) {
    clearTimeout(matchTimer);
    matchTimer = null;
  }
}

function fillWithBots() {
  const missing = MAX_PLAYERS - queue.length;

  for (let i = 0; i < missing; i++) {
    queue.push({ isBot: true });
  }

  console.log(`🤖 ${missing} bots añadidos`);
}

function broadcastCount() {
  queue.forEach((player) => {
    if (player.isBot) return;

    player.send(
      JSON.stringify({
        type: "count",
        current: queue.length,
        max: MAX_PLAYERS,
      })
    );
  });
}

function startGame() {
  console.log("🎮 Iniciando partida");
  clearMatchTimer();

  const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  const detectiveWord = pair[0];
  const impostorWord = pair[1];

  const roles = [
    "detective",
    "detective",
    "detective",
    "impostor",
    "impostor",
  ].sort(() => Math.random() - 0.5);

  queue.forEach((player, index) => {
    if (player.isBot) return;

    const role = roles[index];
    const word = role === "impostor" ? impostorWord : detectiveWord;

    player.send(
      JSON.stringify({
        type: "game_start",
        role,
        word,
      })
    );
  });

  queue = [];
}