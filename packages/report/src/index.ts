import {
  ImmutableEvent,
  ImmutableEventEmitter,
} from "../../shared/src/ImmutableEventEmitter.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import eventsEventNames from "../../events/src/events.js";
import { UserActivityEvent } from "events/src/types.js";
import { EventTypesReport, UserReport, UsersReport } from "./types.js";

export abstract class AbstractReport {
  abstract createUsersReport(event: {
    timeInterval: TimeInterval;
  }): Promise<UsersReport>;

  abstract createUserReport(event: {
    userUUID: string;
    timeInterval: TimeInterval;
  }): Promise<UserReport>;

  abstract createEventTypesReport(event: {
    timeInterval: TimeInterval;
  }): Promise<EventTypesReport>;

  abstract createEventsReport(event: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>>;
}

export class ReportMock extends AbstractReport {
  createUsersReport(event: {
    timeInterval: TimeInterval;
  }): Promise<UsersReport> {
    throw new Error("Mock");
  }

  createUserReport(event: {
    userUUID: string;
    timeInterval: TimeInterval;
  }): Promise<UserReport> {
    throw new Error("Mock");
  }

  createEventTypesReport(event: {
    timeInterval: TimeInterval;
  }): Promise<EventTypesReport> {
    throw new Error("Mock");
  }

  createEventsReport(event: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    throw new Error("Mock");
  }
}

export class Report extends AbstractReport {
  #events;

  constructor({ events }: { events: ImmutableEventEmitter }) {
    super();
    this.#events = events;
  }

  async createUsersReport(options: { timeInterval: TimeInterval }) {
    const events = (await this.#events.request(
      eventsEventNames.readMultiple,
      eventsEventNames.readMultipleAfter,
      options
    )) as Array<UserActivityEvent>;
    const usersUUID = new Set(events.map((e) => e.userUUID));
    const result: UsersReport = {};
    usersUUID.forEach(
      (uuid) =>
        (result[uuid] = {
          eventsCount: events.filter((e) => e.userUUID === uuid).length,
        })
    );
    return result;
  }

  async createUserReport(options: {
    userUUID: string;
    timeInterval: TimeInterval;
  }) {
    const events = (await this.#events.request(
      eventsEventNames.readMultiple,
      eventsEventNames.readMultipleAfter,
      options
    )) as Array<UserActivityEvent>;
    const eventsData: UserReport = { events: {} };
    events.forEach((e) =>
      e.type in eventsData.events
        ? (eventsData.events[e.type].count =
            eventsData.events[e.type].count + 1)
        : (eventsData.events[e.type] = { count: 1 })
    );
    return eventsData;
  }

  async createEventTypesReport(options: { timeInterval: TimeInterval }) {
    const events = (await this.#events.request(
      eventsEventNames.readMultiple,
      eventsEventNames.readMultipleAfter,
      options
    )) as Array<UserActivityEvent>;
    const report: EventTypesReport = { events: {} };
    events.forEach((e) =>
      report.events[e.type] === undefined
        ? (report.events[e.type] = { count: 1 })
        : (report.events[e.type].count = report.events[e.type].count + 1)
    );
    return report;
  }

  async createEventsReport(options: { timeInterval: TimeInterval }) {
    const events = (await this.#events.request(
      eventsEventNames.readMultiple,
      eventsEventNames.readMultipleAfter,
      options
    )) as Array<UserActivityEvent>;
    return events;
  }
}
