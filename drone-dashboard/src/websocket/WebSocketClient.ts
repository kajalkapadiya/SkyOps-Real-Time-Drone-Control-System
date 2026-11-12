import type { ClientMessage, ServerMessage } from "./websocketTypes";

export function createWebSocketClient(
  url: string,
  onMessage: (message: ServerMessage) => void,
) {
  const socket = new WebSocket(url);

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data) as ServerMessage;
    onMessage(message);
  };

  function send(message: ClientMessage) {
    socket.send(JSON.stringify(message));
  }

  function close() {
    socket.close();
  }

  return {
    send,
    close,
  };
}
