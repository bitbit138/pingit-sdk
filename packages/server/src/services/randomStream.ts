import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

/**
 * A Readable that emits exactly `totalBytes` of crypto-random data in
 * `chunkSize` chunks, then ends. Generates lazily on demand (honouring
 * backpressure) so the full payload is never buffered in memory.
 */
export function randomByteStream(totalBytes: number, chunkSize = 65536): Readable {
  let remaining = totalBytes;
  return new Readable({
    read() {
      if (remaining <= 0) {
        this.push(null);
        return;
      }
      const size = Math.min(chunkSize, remaining);
      remaining -= size;
      this.push(randomBytes(size));
    },
  });
}
