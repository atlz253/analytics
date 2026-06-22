import { faker } from "@faker-js/faker";
import { check, sleep } from "k6";
import http from "k6/http";
import { Options } from "k6/options";

const SERVER_URL = "http://host.docker.internal:3000";

faker.seed(27);

export const options: Options = {
  stages: [
    { duration: "2m", target: 500 },
    { duration: "5m", target: 500 },
    { duration: "2m", target: 1000 },
    { duration: "5m", target: 1250 },
    { duration: "7m", target: 1500 },
    { duration: "2m", target: 500 },
    { duration: "5m", target: 500 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% запросов должны выполняться менее чем за 500 мс
    http_req_failed: ["rate<0.1"], // Менее 10% запросов должны завершаться ошибкой
  },
  // Настройки для вывода в InfluxDB 2.x (нужны ли?)
  ext: {
    loadimpact: {
      projectID: "event-test-project",
      name: "Event Endpoint Performance Test",
    },
  },
};

export default function () {
  const payload = {
    eventType: "userActivity",
    occurrenceTime: faker.date.recent().toISOString(),
    type: faker.word.verb(),
    userUUID: faker.string.uuid(),
    page: faker.word.noun(),
  };

  const response = http.post(`${SERVER_URL}/event`, JSON.stringify(payload), {
    timeout: "10m",
    headers: { "Content-Type": "application/json" },
    tags: {
      endpoint: "event",
      test_scenario: "load_test",
    },
  });

  const checksResult = check(
    response,
    {
      "status is 200": (r) => r.status === 200,
      "response time < 500ms": (r) => r.timings.duration < 500,
      "content type is JSON": (r) =>
        r.headers["Content-Type"] &&
        r.headers["Content-Type"].includes("application/json"),
      "response is valid JSON": (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    },
    {
      endpoint: "event",
      test_type: "performance",
    },
  );

  if (!checksResult) {
    console.error(`Failed check for VU ${__VU}, iteration ${__ITER}`);
    console.error(`Response status: ${response.status}`);
    console.error(`Response body: ${response.body}`);
  }

  sleep(1);
}

export function setup() {
  console.log("Начало нагрузочного тестирования event эндпоинта...");

  const testPayload = {
    eventType: "userActivity",
    occurrenceTime: new Date().toISOString(),
    type: "scroll",
    userUUID: "b8c5d9e0-2f3a-5678-9012-345678901bcd",
    page: "catalog",
  };

  const response = http.post(
    `${SERVER_URL}/event`,
    JSON.stringify(testPayload),
    {
      timeout: "10m",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (response.status !== 200) {
    console.warn(
      `Предупреждение: event эндпоинт отвечает со статусом ${response.status}`,
    );
    console.warn(`Ответ: ${response.body}`);
  } else {
    console.log("Event эндпоинт доступен и работает корректно");
    try {
      const body = JSON.parse(response.body);
      console.log(`Получен ответ: ${JSON.stringify(body)}`);
    } catch {
      console.warn("Ответ не является валидным JSON");
    }
  }

  return {
    startTime: new Date().toISOString(),
    targetUrl: `${SERVER_URL}/event`,
  };
}

export function teardown(data) {
  console.log("Тестирование завершено.");
  console.log(`URL: ${data.targetUrl}`);
  console.log(`Время начала: ${data.startTime}`);
  console.log(`Время завершения: ${new Date().toISOString()}`);
}
