export abstract class Storage {
  abstract createEvent(event: object): Promise<void>;

  abstract last(): Promise<object | undefined>;
}

export class RAMStorage extends Storage {
  #storage: { events: object[] } = {
    events: [],
  };

  async createEvent(event: object) {
    this.#storage.events.push(event);
  }

  async last() {
    return this.#storage.events.at(-1);
  }
}
