export type PacketInterceptor = (
  data: Uint8Array,
  fromServer: boolean,
  context: { removeInterceptor: () => void },
) => void;

export const isLoginPacket = (data: DataView) =>
  data.getUint8(0) === 0xef || data.getUint8(0) === 0x01;

export const isRelayServerPacket = (data: DataView) =>
  data.byteLength === 11 && data.getUint8(0) === 0x8c;

/**
 * Intercepts packets from both directions to mask the shards ip/port from the relay packet
 * 1. Checks the first packet to see if this is a login socket, if not removes itself from listening further
 * 2. If it's a login socket, wait for the server to send the Relay Packet (0x8C)
 * 3. Sets the ip/port in the packet both to `0`, preventing the client from seeing the shards real IP
 * 4. ClassicUO will read the `0` IP and reconnect to the `settings.json` configuration, which is this worker.
 */
export const getRelayInterceptor = (): PacketInterceptor => {
  let isLoginSocket = false;
  let firstPacket = true;

  return (data, fromServer, context) => {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    if (firstPacket) {
      isLoginSocket = isLoginPacket(view);
      firstPacket = false;

      if (!isLoginSocket) {
        // Remove the interceptor, we don't need to listen to game socket packets (saves cpu time)
        context.removeInterceptor();
      }
    } else if (fromServer && isLoginSocket && isRelayServerPacket(view)) {
      // Remove the IP/Port from the relay packet, hiding the shards address.
      view.setUint32(1, 0, true);
      view.setUint16(5, 0, true);
    }
  };
};
