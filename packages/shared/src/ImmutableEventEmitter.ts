import EventEmitter from "node:events";
import { randomUUID } from "node:crypto";

export interface ImmutableEvent<T = unknown> {
  uuid?: string;
  args: T;
}

export class ImmutableEventEmitter extends EventEmitter {
  request<T extends Array<unknown>>(
    requestEventName: string | symbol,
    responseEventName: string | symbol,
    ...args: T
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (this.listeners(requestEventName).length === 0) {
        reject(
          new Error(
            `отсутствуют обработчики событий для ${requestEventName.toString()}`
          )
        );
      } else {
        const uuid = randomUUID();
        const listener = (event: unknown) => {
          if (
            typeof event === "object" &&
            event !== null &&
            "uuid" in event &&
            event.uuid === uuid
          ) {
            this.off(requestEventName, listener);
            resolve("response" in event ? event.response : undefined);
          }
        };
        this.on(responseEventName, listener);
        this.emit(requestEventName, { uuid, args } as ImmutableEvent);
      }
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
