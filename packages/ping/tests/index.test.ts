import { beforeEach, describe, expect, test } from "vitest";
import { Ping } from "../src/index.js";

describe("ping", () => {
  let ping = new Ping();

  beforeEach(() => {
    ping = new Ping();
  });

  test("ping отвечает pong", async () => {
    expect(ping.pong()).toEqual("pong");
  });
});
