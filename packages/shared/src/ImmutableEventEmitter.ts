import EventEmitter from "node:events";
import { randomUUID } from "node:crypto";

export class ImmutableEventEmitter extends EventEmitter {
  request<R = any>(
    requestEventName: string | symbol,
    responseEventName: string | symbol,
    ...args: any[]
  ): Promise<R> {
    return new Promise((resolve) => {
      const uuid = randomUUID();
      const listener = (event: any) => {
        if (event?.uuid === uuid) resolve(event.response);
        this.off(requestEventName, listener);
      };
      this.on(responseEventName, listener);
      this.emit(requestEventName, { uuid, args });
    });
  }

  emit(eventName: string | symbol, ...args: any[]): boolean {
    const listeners = this.listeners(eventName);
    listeners.forEach((l: Function) =>
      l(...args.map((a) => structuredClone(a)))
    );
    return listeners.length > 0;
  }
}
