const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log("🟢 Servidor WebSocket iniciado en puerto", PORT);

// ===== CONFIG =====
const MAX_PLAYERS = 5;

// ===== PALABRAS =====
// ====== PALABRAS ======
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

  ws.on("message", () => {
    if (!queue.includes(ws)) {
      queue.push(ws);
      broadcastCount();
    }

    if (queue.length === MAX_PLAYERS) {
      startGame();
    }
  });

  ws.on("close", () => {
    queue = queue.filter((p) => p !== ws);
    broadcastCount();
  });
});

// ===== FUNCIONES =====

function broadcastCount() {
  queue.forEach((player) => {
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

  // Elegir palabras
  const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  const detectiveWord = pair[0];
  const impostorWord = pair[1];

  // Crear roles (3 detectives, 2 impostores)
  const roles = [
    "detective",
    "detective",
    "detective",
    "impostor",
    "impostor",
  ];

  // Mezclar roles
  roles.sort(() => Math.random() - 0.5);

  queue.forEach((player, index) => {
    const role = roles[index];
    const word = role === "impostor" ? impostorWord : detectiveWord;

    player.send(
      JSON.stringify({
        type: "game_start",
        role: role,
        word: word,
      })
    );
  });

  queue = []; // limpiar cola
}