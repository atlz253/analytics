import {
  ImmutableEvent,
  ImmutableEventEmitter,
} from "../../shared/src/ImmutableEventEmitter.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import reportEventNames from "./events.js";
import eventsEventNames from "../../events/src/events.js";
import { UserActivityEvent } from "events/src/types.js";
import { UserReport, UsersReport } from "./types.js";

export class Report {
  #events;

  constructor({ events }: { events: ImmutableEventEmitter }) {
    this.#events = events;
    (
      [
        [
          reportEventNames.createUsersReport,
          this.#createUsersReport.bind(this),
        ],
        [reportEventNames.createUserReport, this.#createUserReport.bind(this)],
      ] as const
    ).map(([e, c]) => events.on(e, c));
  }

  async #createUsersReport(
    event: ImmutableEvent<[{ timeInterval: TimeInterval }]>
  ) {
    const [options] = event.args;
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
    this.#events.emit(reportEventNames.createUsersReportAfter, {
      ...event,
      response: result,
    });
  }

  async #createUserReport(
    event: ImmutableEvent<[{ userUUID: string; timeInterval: TimeInterval }]>
  ) {
    const [options] = event.args;
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
    this.#events.emit(reportEventNames.createUserReportAfter, {
      ...event,
      response: eventsData,
    });
  }
}
