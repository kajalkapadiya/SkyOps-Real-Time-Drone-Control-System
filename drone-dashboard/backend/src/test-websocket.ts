import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:5000");

ws.on("open", () => {
  console.log("Connected to server");

  ws.send(
    JSON.stringify({
      action: "PLAY",
    }),
  );
});

ws.on("message", (data) => {
  console.log("Message from server:");
  console.log(data.toString());
});

ws.on("close", () => {
  console.log("Connection closed");
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error);
});
