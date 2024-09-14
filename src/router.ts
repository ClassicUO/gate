import { RouteHandler, Router } from "itty-router";
import * as TCP from "cloudflare:sockets";
import { websocketToStream } from "./socket/stream";
import { getRelayInterceptor } from "./socket/packets";

export const router = (env: Env, ctx: ExecutionContext) =>
  Router()
    .get("/", handleConnect(env, ctx))
    .get("/healthcheck", () => new Response("OK", { status: 200 }));

/**
 * Main entrypoint where we pipe the TCP connection to the websocket.
 * @param env
 * @param ctx
 */
const handleConnect =
  (env: Env, ctx: ExecutionContext): RouteHandler =>
  (request) => {
    const upgradeHeader = request.headers.get("Upgrade");

    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    // We're just going to let the connection throw if it fails, will return a 500
    const tcp = TCP.connect(env.TARGET_ADDRESS);
    const serverStream = websocketToStream(
      server,
      env.MASK_RELAY !== "false" ? getRelayInterceptor() : undefined,
    );

    // Keeps the worker alive until the connection is finished (or we run out of CPU time)
    ctx.waitUntil(
      Promise.any([
        serverStream.readable.pipeTo(tcp.writable),
        tcp.readable.pipeTo(serverStream.writable),
        new Promise((resolve, reject) => {
          server.addEventListener("close", resolve);
          server.addEventListener("error", reject);
        }),
      ]),
    );

    // Start the websocket
    server.accept();

    // Upgrade the connection, client will start sending data
    return new Response(null, { status: 101, webSocket: client });
  };
