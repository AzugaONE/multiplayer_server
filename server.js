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
      game.players = game.players.filter(p => p.ws !== ws);
    }

    // ===== CHAT =====
    if (data.type === "chat") {
      broadcastChat(ws.username || "Jugador", data.text);
      return;
    }

    // ===== JOIN =====
    if (data.type === "join") {
      ws.username = data.username || "Jugador";

      if (!queue.includes(ws)) {
        queue.push(ws);
        broadcastCount();

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
    broadcastCount();
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

function broadcastCount() {
  queue.forEach(player => {
    if (player.isBot) return;
    player.send(JSON.stringify({
      type: "count",
      current: queue.length,
      max: MAX_PLAYERS,
    }));
  });
}

function broadcastChat(sender, text) {
  queue.forEach(player => {
    if (player.isBot) return;
    player.send(JSON.stringify({
      type: "chat",
      text: `${sender}: ${text}`,
    }));
  });
}

function startGame() {
  const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  const roles = ["detective", "detective", "detective", "impostor", "impostor"]
    .sort(() => Math.random() - 0.5);

  const playersList = queue.map((p, index) => {
    return {
      username: p.username || p.username,
      character: p.character || (Math.floor(Math.random() * 12) + 1), // número de personaje random
      role: roles[index],
      isBot: !!p.isBot,
    };
  });

  queue.forEach((player, index) => {
    if (player.isBot) return; // los bots no necesitan WS

    player.send(JSON.stringify({
      type: "game_start",
      players: playersList,
    }));
  });

  queue = [];
}