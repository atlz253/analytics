import { describe, expect, test } from "vitest";
import { storage as initStorage } from "../src/storage";
import { UserActivityEvent } from "../src/types";

describe("RAMStorage", () => {
  test("должен инициализироваться с переданными данными", async () => {
    const event: UserActivityEvent = {
      eventType: "userActivity",
      occurrenceTime: "2025-06-16T21:58:57.269Z",
      type: "focus",
      userUUID: "44a80cf0-b884-4512-983a-489efce54cfe",
      page: "/",
    };
    const storage = await initStorage({
      type: "RAM",
      storage: {
        events: [event],
      },
    });
    expect(await storage.last()).toEqual(event);
  });
});
