import { PacketInterceptor } from "./packets";

/**
 * Important:
 *  This code is performance sensitive, more cycles here will impact CPU time and therefore total connection duration.
 *  Also benchmarking locally is not guaranteed to match the production workers runtime, test all perf improvements against a real deployment.
 */
export class WebSocketDuplex {
  public readable: ReadableStream<Uint8Array>;
  public writable: WritableStream<Uint8Array>;

  constructor(
    private readonly webSocket: WebSocket,
    private readonly onClose: (event?: CloseEvent | string) => void,
    public interceptor?: PacketInterceptor,
  ) {
    /**
     * Client -> Server stream
     * Starts the BYOB stream, adds a message listener to the WebSocket pumping messages into the readable
     */
    this.readable = new ReadableStream({
      type: "bytes",
      cancel: this.close.bind(null, "Readable canceled (client -> server)"),
      start: (controller) =>
        this.webSocket.addEventListener("message", (ev) => {
          // string messages unhandled
          if (!(ev.data instanceof ArrayBuffer)) return;

          this.interceptor?.(new Uint8Array(ev.data), false, this);
          controller.enqueue(ev.data);
        }),
    });

    /**
     * Server -> Client stream
     * Starts a writable stream for the TCP socket to pipe into (i.e. websocket.send)
     */
    this.writable = new WritableStream<Uint8Array>({
      close: this.close.bind(null, "Writable canceled (server -> client)"),
      write: (data: Uint8Array) => {
        this.interceptor?.(data, true, this);
        this.webSocket.send(data);
      },
    });
  }

  // Used by relay interceptor
  // noinspection JSUnusedGlobalSymbols
  public removeInterceptor() {
    this.interceptor = undefined;
  }

  private close(reason: string) {
    try {
      void this.readable.cancel().catch(() => void 0);
      void this.writable.abort().catch(() => void 0);
      this.webSocket.close();
    } catch {}
    this.onClose(reason);
  }
}
