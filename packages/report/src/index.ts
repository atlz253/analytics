import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import { UserActivityEvent } from "events/src/types.js";
import { EventTypesReport, UserReport, UsersReport } from "./types.js";
import { AbstractEvents } from "../../events/src/index.js";
import { omit } from "ramda";

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

  constructor({ events }: { events: AbstractEvents }) {
    super();
    this.#events = events;
  }

  async createUsersReport(options: { timeInterval: TimeInterval }) {
    const events = await this.#events.readEvents(options);
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
    const events = await this.#events.readEvents(options);
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
    const events = await this.#events.readEvents(options);
    const report: EventTypesReport = { events: {} };
    events.forEach((e) =>
      report.events[e.type] === undefined
        ? (report.events[e.type] = { count: 1 })
        : (report.events[e.type].count = report.events[e.type].count + 1)
    );
    return report;
  }

  async createEventsReport(options: { timeInterval: TimeInterval }) {
    const events = await this.#events.readEvents(options);
    return events;
  }
}

export class CloudFunctionReport extends AbstractReport {
  #fallback;

  constructor({ fallback }: { fallback: AbstractReport }) {
    super();
    this.#fallback = fallback;
  }

  async createUsersReport(event: {
    timeInterval: TimeInterval;
  }): Promise<UsersReport> {
    try {
      const response = await fetch(
        "https://d5dabihqt2mj59hvr4c0.svoluuab.apigw.yandexcloud.net/report/users",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );
      const json = await response.json();
      return omit(["statusCode"], json);
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createUsersReport(event);
    }
  }

  async createUserReport(event: {
    userUUID: string;
    timeInterval: TimeInterval;
  }): Promise<UserReport> {
    try {
      const response = await fetch(
        "https://d5dabihqt2mj59hvr4c0.svoluuab.apigw.yandexcloud.net/report/user",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );
      const json = await response.json();
      return omit(["statusCode"], json) as UserReport;
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createUserReport(event);
    }
  }

  async createEventTypesReport(event: {
    timeInterval: TimeInterval;
  }): Promise<EventTypesReport> {
    try {
      const response = await fetch(
        "https://d5dabihqt2mj59hvr4c0.svoluuab.apigw.yandexcloud.net/report/eventTypes",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );
      const json = await response.json();
      return omit(["statusCode"], json) as EventTypesReport;
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createEventTypesReport(event);
    }
  }

  async createEventsReport(event: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    try {
      const response = await fetch(
        "https://d5dabihqt2mj59hvr4c0.svoluuab.apigw.yandexcloud.net/report/events",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );
      const json = await response.json();
      if (json.errorCode) throw new Error(JSON.stringify(json));
      return omit(["statusCode"], json) as Array<UserActivityEvent>;
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createEventsReport(event);
    }
  }
}
