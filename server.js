// server.js
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 5;
const MATCH_TIMEOUT = 20 * 1000; // 1 minuto

const wss = new WebSocket.Server({ port: PORT });
console.log("🟢 Servidor WebSocket iniciado en puerto", PORT);

// ===== PALABRAS (solo ejemplo) =====
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

// ===== MATCHMAKING =====
let queue = [];
let matchTimer = null;

wss.on("connection", (ws) => {
  console.log("🔵 Jugador conectado");

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      console.log("❌ Mensaje no JSON:", msg.toString());
      return;
    }

    // ===== JOIN =====
    if (data.type === "join" && !queue.includes(ws)) {
      ws.username = data.username || "Jugador"; // username real
      ws.isBot = false;

      queue.push(ws);
      broadcastCount();

      if (queue.length === 1) startMatchTimer();

      if (queue.length === MAX_PLAYERS) {
        clearMatchTimer();
        startGame();
      }
    }

    // ===== PALABRA DEL JUGADOR =====
    if (data.type === "submit_word") {
      const game = ws.game;
      if (!game) return;

      game.words.push({
        username: ws.username,
        word: data.word,
      });

      broadcastWords(game);

      game.currentTurn++;
      if (game.currentTurn < game.players.length) {
        const next = game.players[game.currentTurn];
        if (!next.isBot) {
          next.send(JSON.stringify({ type: "your_turn" }));
        } else {
          // Bot escribe automáticamente
          const botWord = "BotWord" + (game.currentTurn + 1);
          game.words.push({ username: next.username, word: botWord });
          broadcastWords(game);
          game.currentTurn++;
        }
      }
    }
  });

  ws.on("close", () => {
    queue = queue.filter((p) => p !== ws);
    broadcastCount();
  });
});

// ===== FUNCIONES =====
function broadcastCount() {
  queue.forEach((p) => {
    if (!p.isBot) {
      p.send(JSON.stringify({
        type: "count",
        current: queue.length,
        max: MAX_PLAYERS,
      }));
    }
  });
}

function startMatchTimer() {
  matchTimer = setTimeout(() => {
    console.log("⏰ Tiempo agotado → bots");
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
      username: `Bot${i + 1}`,
      send: () => {},
    });
  }
}

function broadcastWords(game) {
  game.players.forEach((p) => {
    if (!p.isBot) {
      p.send(JSON.stringify({
        type: "update_words",
        words: game.words,
      }));
    }
  });
}

function startGame() {
  console.log("🎮 Iniciando partida");

  clearMatchTimer();
  fillWithBots();

  const [detectiveWord, impostorWord] =
    WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];

  const roles = ["detective", "detective", "detective", "impostor", "impostor"]
    .sort(() => Math.random() - 0.5);

  const game = {
    players: [...queue],
    currentTurn: 0,
    words: [],
  };

  queue.forEach((player, i) => {
    player.role = roles[i];
    player.word = roles[i] === "impostor" ? impostorWord : detectiveWord;
    player.game = game;

    if (!player.isBot) {
      player.send(JSON.stringify({
        type: "game_start",
        role: player.role,
        word: player.word,
      }));
    }
  });

  // Primer turno
  const first = game.players[0];
  if (!first.isBot) {
    first.send(JSON.stringify({ type: "your_turn" }));
  }

  queue = [];
}