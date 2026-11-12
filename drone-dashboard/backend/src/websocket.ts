// import { WebSocketServer } from "ws";
// import { ReplayService } from "./replay/ReplayService.js";
// import { MissionRepository } from "./repositories/MissionRepository.js";

// const PORT = 5000;

// const wss = new WebSocketServer({
//   port: PORT,
// });

// // Send data to all connected clients
// function broadcast(data: unknown) {
//   const message = JSON.stringify(data);

//   wss.clients.forEach((client) => {
//     if (client.readyState === client.OPEN) {
//       client.send(message);
//     }
//   });
// }

// async function startServer() {
//   const missionRepository = new MissionRepository();
//   const mission = await missionRepository.findById("mission-001");

//   // Create ReplayService
//   const replayService = new ReplayService(mission, (frame) => {
//     broadcast({
//       type: "frame",
//       frame,
//     });
//   });

//   // Listen for clients
//   wss.on("connection", (ws) => {
//     console.log("Client connected");

//     // Send initial connection message
//     ws.send(
//       JSON.stringify({
//         type: "status",
//         status: replayService.getStatus(),
//       }),
//     );

//     ws.send(
//       JSON.stringify({
//         type: "replayState",
//         state: replayService.getReplayState(),
//       }),
//     );

//     // Listen for messages from THIS client
//     ws.on("message", (raw) => {
//       const message = JSON.parse(raw.toString());

//       console.log("Received:", message);

//       if (message.action === "PLAY") {
//         replayService.play();

//         broadcast({
//           type: "status",
//           status: replayService.getStatus(),
//         });
//       }

//       if (message.action === "PAUSE") {
//         replayService.pause();

//         broadcast({
//           type: "status",
//           status: replayService.getStatus(),
//         });
//       }

//       if (message.action === "SEEK") {
//         replayService.seek(message.frame);

//         broadcast({
//           type: "replayState",
//           state: replayService.getReplayState(),
//         });
//       }

//       if (message.action === "SPEED") {
//         replayService.setSpeed(message.value);
//       }
//     });
//   });
// }

// startServer();

// console.log(`WebSocket server running on ws://localhost:${PORT}`);
import { WebSocketServer } from "ws";
import { ReplayService } from "./replay/ReplayService.js";
import { MissionRepository } from "./repositories/MissionRepository.js";

const PORT = 5000;

const wss = new WebSocketServer({
  port: PORT,
});

// Send data to all connected clients
function broadcast(data: unknown) {
  const message = JSON.stringify(data);

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

async function startServer() {
  const missionRepository = new MissionRepository();
  const mission = await missionRepository.findById("mission-001");

  // Create ReplayService
  const replayService = new ReplayService(mission, (frame) => {
    broadcast({
      type: "frame",
      frame,
    });
  });

  // Listen for clients
  wss.on("connection", (ws) => {
    console.log("Client connected");

    // Send current replay status to THIS client
    ws.send(
      JSON.stringify({
        type: "status",
        status: replayService.getStatus(),
      }),
    );

    // Send current replay state to THIS client
    ws.send(
      JSON.stringify({
        type: "replayState",
        state: replayService.getReplayState(),
      }),
    );

    // Listen for messages from THIS client
    ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString());

      console.log("Received:", message);

      if (message.action === "PLAY") {
        replayService.play();

        broadcast({
          type: "replayState",
          status: replayService.getReplayState(),
        });
      }

      if (message.action === "PAUSE") {
        replayService.pause();

        broadcast({
          type: "replayState",
          status: replayService.getReplayState(),
        });
      }

      if (message.action === "SEEK") {
        replayService.seek(message.frame);

        broadcast({
          type: "replayState",
          state: replayService.getReplayState(),
        });
      }

      if (message.action === "SET_SPEED") {
        replayService.setSpeed(message.speed);

        broadcast({
          type: "replayState",
          state: replayService.getReplayState(),
        });
      }
    });
  });
}

startServer();

console.log(`WebSocket server running on ws://localhost:${PORT}`);
