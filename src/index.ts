import { router } from "./router";
import { debug } from "./socket/util";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    if (env.ENVIRONMENT === "development") {
      debug(
        `[handleConnect] piping websocket connection from ${request.headers.get(
          "Cf-Connecting-Ip",
        )} to ${env.TARGET_ADDRESS}, MASK_RELAY=${env.MASK_RELAY}`,
      );
    }

    return router(env, ctx).handle(request);
  },
};
