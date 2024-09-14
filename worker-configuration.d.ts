interface Env {
  ENVIRONMENT: "development" | "production";

  // Target address, where the proxy will connect to
  TARGET_ADDRESS: string;
  // Whether to mask the relay, defaults to true
  MASK_RELAY?: "true" | "false";
}
