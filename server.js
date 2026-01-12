const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log("🟢 Servidor WebSocket iniciado en puerto", PORT);

const MAX_PLAYERS = 5;

// PALABRAS (solo de ejemplo)
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

wss.on("connection", (ws) => {
  console.log("🔵 Jugador conectado");

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    // ===== Contador =====
    if (data.type === "join" && !queue.includes(ws)) {
      queue.push(ws);
      broadcastCount();

      if (queue.length === MAX_PLAYERS) {
        startGame();
      }
    }

    // ===== Palabra enviada por jugador =====
    if (data.type === "submit_word") {
      const game = ws.game;
      if (!game) return;

      const { username, word } = data;
      game.words.push({ username, word });

      // Avisar a todos los jugadores de la partida
      game.players.forEach((p) => {
        p.send(JSON.stringify({
          type: "update_words",
          words: game.words
        }));
      });

      // Cambiar turno
      game.currentTurn++;
      if (game.currentTurn < game.players.length) {
        game.players[game.currentTurn].send(JSON.stringify({
          type: "your_turn"
        }));
      }
    }
  });

  ws.on("close", () => {
    queue = queue.filter((p) => p !== ws);
    broadcastCount();
  });
});

function broadcastCount() {
  queue.forEach((player) => {
    player.send(JSON.stringify({
      type: "count",
      current: queue.length,
      max: MAX_PLAYERS
    }));
  });
}

// ===== INICIO DE PARTIDA =====
function startGame() {
  console.log("🎮 Iniciando partida");

  const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  const detectiveWord = pair[0];
  const impostorWord = pair[1];

  const roles = ["detective","detective","detective","impostor","impostor"].sort(() => Math.random() - 0.5);

  // Crear objeto de juego
  const game = {
    players: [...queue],
    currentTurn: 0,
    words: []
  };

  queue.forEach((player, index) => {
    player.role = roles[index];
    player.word = roles[index] === "impostor" ? impostorWord : detectiveWord;
    player.game = game;

    // Avisar inicio de partida
    player.send(JSON.stringify({
      type: "game_start",
      role: player.role,
      word: player.word,
      username: "Jugador" + (index + 1) // por ahora usamos un nombre dummy
    }));
  });

  // Avisar el primer turno
  game.players[game.currentTurn].send(JSON.stringify({
    type: "your_turn"
  }));

  queue = [];
}