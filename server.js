const WebSocket = require("ws");

// Render usa un puerto dinámico
const PORT = process.env.PORT || 3000;

// Crear servidor WebSocket
const wss = new WebSocket.Server({ port: PORT });

// Estructura de rooms
// {
//   roomId: {
//     players: Set<WebSocket>
//   }
// }
const rooms = {};

const MAX_PLAYERS = 5;

console.log("🟢 Servidor WebSocket iniciado en puerto", PORT);

wss.on("connection", (ws) => {
  console.log("🔵 Jugador conectado");

  let currentRoom = null;

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());

      // ====== JOIN ROOM ======
      if (message.type === "join_room") {
        const roomId = message.roomId || "default";

        // Crear room si no existe
        if (!rooms[roomId]) {
          rooms[roomId] = {
            players: new Set(),
          };
        }

        const room = rooms[roomId];

        // Room llena
        if (room.players.size >= MAX_PLAYERS) {
          ws.send(
            JSON.stringify({
              type: "room_full",
            })
          );
          return;
        }

        // Agregar jugador
        room.players.add(ws);
        currentRoom = roomId;

        console.log(
          `✅ Jugador unido a room ${roomId} (${room.players.size}/${MAX_PLAYERS})`
        );

        // Enviar cantidad actual a todos
        broadcastRoomCount(roomId);
      }
    } catch (e) {
      console.error("❌ Error al procesar mensaje:", e);
    }
  });

  ws.on("close", () => {
    console.log("🔴 Jugador desconectado");

    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].players.delete(ws);

      // Si el room queda vacío, borrarlo
      if (rooms[currentRoom].players.size === 0) {
        delete rooms[currentRoom];
        console.log(`🗑️ Room ${currentRoom} eliminada`);
      } else {
        broadcastRoomCount(currentRoom);
      }
    }
  });
});

// ====== FUNCIONES ======

function broadcastRoomCount(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const count = room.players.size;

  room.players.forEach((player) => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(
        JSON.stringify({
          type: "room_count",
          count: count,
          max: MAX_PLAYERS,
        })
      );
    }
  });
}