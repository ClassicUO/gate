import { PacketInterceptor } from "./packets";
import { debug } from "./util";
import { WebSocketDuplex } from "./WebSocketDuplex";

export interface WebsocketStream {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

const logError = (event: ErrorEvent) => {
  debug(
    `[websocketToStream] errored: ${event.message}`,
    event,
    event.error instanceof Error ? event.message : event.type,
  );
};

const logClose = (input?: CloseEvent | string) => {
  if (input instanceof CloseEvent) {
    debug("[websocketToStream] websocket closed", {
      wasClean: input.wasClean,
      type: input.type,
      code: input.code,
      reason: input.reason,
    });
  } else {
    debug("[websocketToStream] websocket closed", {
      reason: input,
    });
  }
};

export const websocketToStream = (
  webSocket: WebSocket,
  interceptor?: PacketInterceptor,
): WebsocketStream => {
  webSocket.addEventListener("error", logError);
  webSocket.addEventListener("close", logClose);

  return new WebSocketDuplex(webSocket, logClose, interceptor);
};
