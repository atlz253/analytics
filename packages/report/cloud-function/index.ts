import { Handler } from "@yandex-cloud/function-types";
import { initEvents } from "../../events/src/index.js";
import { tlsCAFile } from "../../shared/src/cloud-function/tlsCAFile.js";
import { Report } from "../src/index.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";

const initReport = async (): Promise<Report> => {
  const events = await initEvents({
    storage: {
      type: "mongo",
      host: "mongodb://user2:12345678@rc1b-uumhquflh32vru1k.mdb.yandexcloud.net:27018/",
      options: {
        tls: true,
        tlsCAFile: await tlsCAFile(),
        authSource: "events",
      },
    },
  });
  return new Report({ events });
};

// FIXME: валидация входных данных в yandex functions
export const users: Handler.Http = async (event, context) => {
  const report = await initReport();
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      statusCode: 200,
      users: await report.createUsersReport(
        JSON.parse(event.body) as { timeInterval: TimeInterval }
      ),
    }),
  };
};

export const user: Handler.Http = async (event, context) => {
  const report = await initReport();
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      statusCode: 200,
      user: await report.createUserReport(
        JSON.parse(event.body) as {
          timeInterval: TimeInterval;
          userUUID: string;
        }
      ),
    }),
  };
};

export const eventTypes: Handler.Http = async (event, context) => {
  const report = await initReport();
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      statusCode: 200,
      ...(await report.createEventTypesReport(
        JSON.parse(event.body) as { timeInterval: TimeInterval }
      )),
    }),
  };
};

export const events: Handler.Http = async (event, context) => {
  const report = await initReport();
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      statusCode: 200,
      events: await report.createEventsReport(
        JSON.parse(event.body) as { timeInterval: TimeInterval }
      ),
    }),
  };
};
