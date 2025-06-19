import { Readable, Writable } from "node:stream";

export class StreamRegistry<T extends Readable | Writable> extends Map<
  string,
  T
> {
  get(key: string): T | undefined {
    const result = super.get(key);
    this.delete(key);
    return result;
  }
}
