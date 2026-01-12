// server.js
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 5;
const MATCH_TIMEOUT = 60 * 1000; // 1 minuto

// ===== SERVIDOR =====
const wss = new WebSocket.Server({ port: PORT });
console.log("🟢 Servidor WebSocket iniciado en puerto", PORT);

// ===== PALABRAS (ejemplo) =====
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
      console.log("❌ Mensaje no es JSON:", msg);
      return;
    }

    // ===== UNIRSE =====
    if (data.type === "join" && !queue.includes(ws)) {
      queue.push(ws);
      broadcastCount();

      // Iniciar timer si es el primer jugador
      if (queue.length === 1) startMatchTimer();

      // Si ya hay 5 jugadores reales
      if (queue.length === MAX_PLAYERS) {
        clearMatchTimer();
        startGame();
      }
    }

    // ===== ENVIAR PALABRA =====
    if (data.type === "submit_word") {
      const game = ws.game;
      if (!game) return;

      const { username, word } = data;
      game.words.push({ username, word });

      // Avisar a todos los jugadores
      game.players.forEach((p) => {
        if (!p.isBot) {
          p.send(JSON.stringify({
            type: "update_words",
            words: game.words
          }));
        }
      });

      // Cambiar turno
      game.currentTurn++;
      if (game.currentTurn < game.players.length) {
        const nextPlayer = game.players[game.currentTurn];
        if (!nextPlayer.isBot) {
          nextPlayer.send(JSON.stringify({ type: "your_turn" }));
        } else {
          // Bot "escribe" palabra automáticamente
          const botWord = "PalabraBot" + (game.currentTurn + 1);
          game.words.push({ username: nextPlayer.username, word: botWord });
          broadcastWords(game);
          game.currentTurn++;
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
function broadcastCount() {
  queue.forEach((player) => {
    if (!player.isBot) {
      player.send(JSON.stringify({
        type: "count",
        current: queue.length,
        max: MAX_PLAYERS
      }));
    }
  });
}

function startMatchTimer() {
  if (matchTimer) return;

  matchTimer = setTimeout(() => {
    console.log("⏰ Tiempo agotado, llenando con bots...");
    startGame();
  }, MATCH_TIMEOUT);
}

function clearMatchTimer() {
  if (matchTimer) {
    clearTimeout(matchTimer);
    matchTimer = null;
  }
}

function fillWithBots(queue) {
  const missing = MAX_PLAYERS - queue.length;
  for (let i = 0; i < missing; i++) {
    const bot = {
      isBot: true,
      username: "Bot" + (i + 1),
      send: () => {},
    };
    queue.push(bot);
  }
  console.log(`🤖 Se agregaron ${missing} bots`);
  return queue;
}

function broadcastWords(game) {
  game.players.forEach((p) => {
    if (!p.isBot) {
      p.send(JSON.stringify({
        type: "update_words",
        words: game.words
      }));
    }
  });
}

function startGame() {
  console.log("🎮 Iniciando partida");

  clearMatchTimer();
  queue = fillWithBots(queue);

  const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  const detectiveWord = pair[0];
  const impostorWord = pair[1];

  const roles = ["detective","detective","detective","impostor","impostor"]
                  .sort(() => Math.random() - 0.5);

  const game = {
    players: [...queue],
    currentTurn: 0,
    words: []
  };

  queue.forEach((player, index) => {
    player.role = roles[index];
    player.word = roles[index] === "impostor" ? impostorWord : detectiveWord;
    player.game = game;

    if (!player.isBot) {
      player.send(JSON.stringify({
        type: "game_start",
        role: player.role,
        word: player.word,
        username: player.username || "Jugador" + (index + 1)
      }));
    }
  });

  // Avisar primer turno
  const firstPlayer = game.players[game.currentTurn];
  if (!firstPlayer.isBot) {
    firstPlayer.send(JSON.stringify({ type: "your_turn" }));
  }

  queue = [];
}