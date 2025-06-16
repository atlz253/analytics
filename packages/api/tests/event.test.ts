import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { API } from "../src";
import { localhost } from "./utils/address";
import { events as initEvents } from "../../events/src";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter";
import { omit } from "ramda";
import fastify from "./utils/fastify";
import { post } from "./utils/fetch";

describe("/event", async () => {
  let events = new ImmutableEventEmitter();
  let api = new API({ events });
  let eventsModule = await initEvents({ events, storage: "RAM" });

  const url = () => localhost(api.port) + "/event";

  beforeEach(async () => {
    events = new ImmutableEventEmitter();
    api = new API({ events });
    eventsModule = await initEvents({ events, storage: "RAM" });
    await api.listen();
  });

  afterEach(async () => {
    await api.close();
  });

  test("должна возвращаться ошибка если не переданы данные", async () => {
    const response = await fetch(url(), {
      method: "POST",
    });
    expect(await response.json()).toEqual(fastify.errors.bodyMustBeObject);
  });

  test("данные о событии должны сохраняться", async () => {
    const event = {
      eventType: "userActivity",
      occurrenceTime: "2025-06-14T20:27:23.745Z",
      type: "click",
      userUUID: "17214028-0fdb-4a98-993d-2a08256e60cf",
      page: "index",
    };
    const response = await fetch(url(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(event),
    });
    expect(await response.json()).toEqual({ statusCode: 200 });
    const lastEvent = await eventsModule.last();
    expect(typeof lastEvent).toBe("object");
    if (lastEvent !== undefined && "createTime" in lastEvent)
      delete lastEvent.createTime;
    expect(lastEvent).toEqual(event);
  });

  test("должны присутствовать все обязательные поля", async () => {
    const event = {
      eventType: "userActivity",
      occurrenceTime: "2025-05-14T18:27:23.745Z",
      type: "load",
      userUUID: "17224028-0fdb-4a98-993d-2a08256e60cf",
      page: "about",
      optional: "это опциональное поле",
    };
    await Promise.all(
      ["eventType", "occurrenceTime", "type", "userUUID", "page"].map(
        async (k) => {
          expect(
            await post(url(), {
              body: JSON.stringify(omit([k as keyof typeof event], event)),
            })
          ).toEqual(fastify.errors.bodyMustHaveRequiredProperty(k));
        }
      )
    );
  });

  test("опциональные свойства должны сохраняться", async () => {
    const event = {
      eventType: "userActivity",
      occurrenceTime: "2023-05-14T18:27:23.745Z",
      type: "error",
      userUUID: "27224028-0edb-4a98-993d-2a08256e60cf",
      page: "prices",
      optional: "Мне нужно быть сохраненным",
    };
    expect(
      await post(url(), {
        body: JSON.stringify(event),
      })
    ).toEqual({
      statusCode: 200,
    });
    const last = await eventsModule.last();
    if (typeof last === "object" && "createTime" in last)
      delete last.createTime;
    expect(last).toEqual(event);
  });
});
