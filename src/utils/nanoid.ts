import { webcrypto as crypto } from "node:crypto";
import { urlAlphabet as scopedUrlAlphabet } from "./consts";

export { urlAlphabet } from "./consts";

// It is best to make fewer, larger requests to the crypto module to
// avoid system call overhead. So, random numbers are generated in a
// pool. The pool is a Buffer that is larger than the initial random
// request size by this multiplier. The pool is enlarged if subsequent
// requests exceed the maximum buffer size.
const POOL_SIZE_MULTIPLIER = 128;

let pool: Buffer;
let poolOffset: number;

function fillPool(bytes: number): void {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    crypto.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    crypto.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}

export function random(bytes: number): Buffer {
  // `|=` convert `bytes` to number to prevent `valueOf` abusing and pool pollution
  fillPool((bytes |= 0));
  return pool.subarray(poolOffset - bytes, poolOffset);
}

export function customRandom(
  alphabet: string,
  defaultSize: number,
  getRandom: (bytes: number) => Buffer
): (size?: number) => string {
  // First, a bitmask is necessary to generate the ID. The bitmask makes bytes
  // values closer to the alphabet size. The bitmask calculates the closest
  // `2^31 - 1` number, which exceeds the alphabet size.
  // For example, the bitmask for the alphabet size 30 is 31 (00011111).
  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1;

  // Next, a step determines how many random bytes to generate.
  const step = Math.ceil((1.6 * mask * defaultSize) / alphabet.length);

  return (size: number = defaultSize): string => {
    let id = "";
    while (true) {
      const bytes = getRandom(step);
      let i = step;
      while (i--) {
        // Adding `|| ''` refuses a random byte that exceeds the alphabet size.
        id += alphabet[bytes[i] & mask] || "";
        if (id.length >= size) return id;
      }
    }
  };
}

export function customAlphabet(
  alphabet: string,
  size = 21
): (size?: number) => string {
  return customRandom(alphabet, size, random);
}

export function nanoid(size = 21): string {
  // `|=` convert `size` to number to prevent `valueOf` abusing and pool pollution
  fillPool((size |= 0));
  let id = "";
  // We are reading directly from the random pool to avoid creating new array
  for (let i = poolOffset - size; i < poolOffset; i++) {
    id += scopedUrlAlphabet[pool[i] & 63];
  }
  return id;
}
