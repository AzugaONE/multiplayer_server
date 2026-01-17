const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log("🟢 Servidor de juego iniciado en puerto", PORT);

// ===== CONFIG =====
const MAX_PLAYERS = 5;
const MATCH_TIMEOUT = 10 * 1000;

let queue = [];
let matchTimer = null;

// ===== PALABRAS =====
const WORD_PAIRS = [
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

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    if (data.type === "leave_game") {
      queue = queue.filter(p => p.ws !== ws);
      console.log(`Jugador salió. Jugadores en cola: ${queue.length}`);
    }

    if (data.type === "join") {
      ws.username = data.username || "Jugador";
      ws.character = data.character;

      if (!queue.includes(ws)) {
        queue.push(ws);
        console.log(`Jugador unido: ${ws.username}. Cola actual: ${queue.length}`);

        if (queue.length === 1) startMatchTimer();
        if (queue.length === MAX_PLAYERS) {
          clearMatchTimer();
          startGame();
        }
      }
    }
  });

  ws.on("close", () => {
    queue = queue.filter(p => p !== ws);
    console.log("Jugador desconectado. Cola actual:", queue.length);
  });
});

// ===== FUNCIONES =====
function startMatchTimer() {
  if (matchTimer) return;

  matchTimer = setTimeout(() => {
    fillWithBots();
    startGame();
  }, MATCH_TIMEOUT);
}

function clearMatchTimer() {
  clearTimeout(matchTimer);
  matchTimer = null;
}

function fillWithBots() {
  const missing = MAX_PLAYERS - queue.length;
  for (let i = 0; i < missing; i++) {
    queue.push({ isBot: true, username: `BOT ${i + 1}` });
  }
}

function startGame() {
  const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  const roles = ["detective", "detective", "detective", "impostor", "impostor"]
    .sort(() => Math.random() - 0.5);

  const playersList = queue.map((p, index) => ({
    username: p.username,
    character: p.character || Math.floor(Math.random() * 12) + 1,
    role: roles[index],
    isBot: !!p.isBot,
  }));

  queue.forEach((player, index) => {
    if (player.isBot) return;

    player.send(JSON.stringify({
      type: "game_start",
      role: roles[index],
      word: roles[index] === "impostor" ? pair[1] : pair[0],
      players: playersList,
    }));
  });

  console.log("✅ Partida iniciada con jugadores:", playersList.map(p => p.username));
  queue = [];
  clearMatchTimer();
}