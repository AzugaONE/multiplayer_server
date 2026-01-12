const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log("🟢 Servidor WebSocket iniciado en puerto", PORT);

const MAX_PLAYERS = 5;
const MATCH_TIMEOUT = 20000;

let queue = [];
let matchTimer = null;

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

wss.on("connection", (ws) => {
  console.log("🔵 Jugador conectado");

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      queue.push({
        socket: ws,
        username: data.username || "Jugador",
        isBot: false,
      });

      broadcastCount();

      if (queue.length === 1) startMatchTimer();
      if (queue.length === MAX_PLAYERS) {
        clearMatchTimer();
        startGame();
      }
    }
  });

  ws.on("close", () => {
    queue = queue.filter((p) => p.socket !== ws);
    broadcastCount();
  });
});

function startMatchTimer() {
  if (matchTimer) return;

  matchTimer = setTimeout(() => {
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
    queue.push({
      isBot: true,
      username: "Bot",
    });
  }
}

function broadcastCount() {
  queue.forEach((p) => {
    if (p.isBot) return;
    p.socket.send(
      JSON.stringify({
        type: "count",
        current: queue.length,
        max: MAX_PLAYERS,
      })
    );
  });
}

function startGame() {
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

  const playersList = queue.map((p) => p.username);

  queue.forEach((p, index) => {
    if (p.isBot) return;

    const role = roles[index];
    const word = role === "impostor" ? impostorWord : detectiveWord;

    p.socket.send(
      JSON.stringify({
        type: "game_start",
        role,
        word,
        players: playersList,
      })
    );
  });

  queue = [];
}