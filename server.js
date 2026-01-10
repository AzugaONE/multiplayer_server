const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

const rooms = {};
const MAX_PLAYERS = 5;

console.log("🟢 Servidor WebSocket iniciado en puerto", PORT);

wss.on("connection", (ws) => {
  console.log("🔵 Jugador conectado");

  let currentRoom = null;

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === "join_room") {
        const roomId = message.roomId || "default";

        if (!rooms[roomId]) {
          rooms[roomId] = {
            players: new Set(),
            started: false,
          };
        }

        const room = rooms[roomId];

        // ❌ Si la partida ya empezó
        if (room.started) {
          ws.send(JSON.stringify({ type: "game_already_started" }));
          return;
        }

        // ❌ Room llena
        if (room.players.size >= MAX_PLAYERS) {
          ws.send(JSON.stringify({ type: "room_full" }));
          return;
        }

        room.players.add(ws);
        currentRoom = roomId;

        console.log(
          `✅ Jugador unido a room ${roomId} (${room.players.size}/${MAX_PLAYERS})`
        );

        broadcastRoomCount(roomId);

        // 🚀 INICIAR PARTIDA
        if (room.players.size === MAX_PLAYERS) {
          room.started = true;
          broadcast(roomId, {
            type: "start_game",
          });
        }
      }
    } catch (e) {
      console.error("❌ Error:", e);
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].players.delete(ws);

      if (rooms[currentRoom].players.size === 0) {
        delete rooms[currentRoom];
        console.log(`🗑️ Room ${currentRoom} eliminada`);
      } else {
        broadcastRoomCount(currentRoom);
      }
    }
  });
});

// ===== FUNCIONES =====

function broadcastRoomCount(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  broadcast(roomId, {
    type: "room_count",
    count: room.players.size,
    max: MAX_PLAYERS,
  });
}

function broadcast(roomId, message) {
  const room = rooms[roomId];
  if (!room) return;

  room.players.forEach((player) => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(message));
    }
  });
}