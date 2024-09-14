# Gate - Cloudflare UO Proxy

This repository contains ClassicUO Gate, which is a [Cloudflare Worker](https://developers.cloudflare.com/workers/) UO Proxy.
It's main purpose is to shield UO servers from DDoS attacks by putting them behind Cloudflare.

It works by utilising the newly added [WebSocket support in ClassicUO](https://github.com/ClassicUO/ClassicUO/pull/1707)
to enable websocket based connections to a shard that doesn't natively support them.
Most shards don't accept WebSockets by default, so this worker performs the TCP connection to the shard and pipes the
WebSocket and TCP connection together.

## Caveats/Things to know

### New costs and maximum connection durations

Cloudflare Workers is **billed on CPU time** and each packet costs a tiny bit of CPU to go between WS <-> TCP.
Therefore, **CPU time factors greatly limits** total connection time, placing an upper limit on it depending on how
noisy (packets per second) the connection is.
It also has an effect on your Cloudflare bill depending on how popular your shard is what your average concurrent
players is.

[See this spreadsheet for maximum durations and billing scenarios](https://docs.google.com/spreadsheets/d/14xaufq10_TaejvD5l_VBwiWWcTfHt3d_sVz7bugTwgo/edit?gid=0#gid=0)

TL;DR It's estimated to cost about $32.40 for 100 concurrent connections per month.

### Client IPs will be from Cloudflare

As all connections will now be via Cloudflare this will mask the clients real IP. Right now there's no IP limiting in
this project, but we may add it at some point if there's demand.

### Latency

There will likely be a small latency increase due to the nature of proxying the connection. Though [Cloudflare has many
PoPs](https://www.cloudflare.com/en-au/network/) where workers run at their edge it may still add 10s of milliseconds to ping time depending on how far away the user
is from a Cloudflare PoP.

### Disconnections

Since the websocket connections go via Cloudflare you lose some amount of control over random disconnections. They can
happen for several reasons outside the workers control:

1. Cloudflare backend restarts, this can kick connections if they update the worker runtime
2. New deployments of the proxy may kick users currently connected.
3. Depending on player behaviour the worker can run out of CPU time and kill the connection (as explained above).

## Installation

**Pre-requisites:**

- Cloudflare account (optionally with a domain attached).
- Install [Node.js](https://nodejs.org/en/download) installed, tested on v20+

**Steps**

1. Fork/Clone this repository
2. Run in a terminal in the cloned directory `npm install`
3. Open `wrangler.toml`
    - Update the IP/Port target from `1.1.1.1:259` to your desired IP
    - Set a `cpu_limit` if desired
4. Open a terminal (command prompt) in the cloned directory (from step 1)
5. In the terminal run:
    - `npm install`
    - `npm run deploy`
    - Make note of the address your worker is given
6. After deploying, make the following changes to your ClassicUO `settings.json`:
    - Set the `ip` field to the workers address (from above)  using the wss scheme, e.g. `wss://my.worker.dev`
    - Set the `port` field to `443`

