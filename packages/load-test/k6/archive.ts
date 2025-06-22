import http from "k6/http";
import { check, sleep } from "k6";
import { faker } from "@faker-js/faker";

faker.seed(27);

export let options = {
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
    "http_req_duration{endpoint:event}": ["p(95)<500"],
    "http_req_duration{endpoint:archive}": ["p(95)<1000"], // Архивация может быть медленнее
    "http_req_duration{endpoint:download}": ["p(95)<1000"],
    "http_req_failed{endpoint:event}": ["rate<0.1"],
    "http_req_failed{endpoint:archive}": ["rate<0.1"],
    "http_req_failed{endpoint:download}": ["rate<0.1"],
  },
  ext: {
    loadimpact: {
      projectID: "archive-test-project",
      name: "Archive Endpoint Performance Test",
    },
  },
};

// Глобальные переменные для хранения дат
let minDate = null;
let maxDate = null;

function generateEventPayload() {
  const occurrenceTime = faker.date.between({
    from: "2024-01-01",
    to: "2024-12-31",
  });
  // Обновляем минимальную и максимальную даты
  if (!minDate || occurrenceTime < minDate) minDate = occurrenceTime;
  if (!maxDate || occurrenceTime > maxDate) maxDate = occurrenceTime;
  return {
    eventType: "userActivity",
    occurrenceTime: occurrenceTime.toISOString(),
    type: faker.word.verb(),
    userUUID: faker.string.uuid(),
    page: faker.word.noun(),
  };
}

function formatDateYYYYMMDD(date) {
  return date.toISOString().split("T")[0]; // Формат YYYY-MM-DD
}

function generateArchivePayload() {
  if (!minDate || !maxDate) return null;
  // Случайная дата между minDate и maxDate
  const endTime = faker.date.between({ from: minDate, to: maxDate });
  return {
    timeInterval: {
      start: formatDateYYYYMMDD(minDate),
      end: formatDateYYYYMMDD(endTime),
    },
  };
}

export function setup() {
  console.log("Начало нагрузочного тестирования archive эндпоинта...");
  // Отправляем 100 событий для создания начального пула данных
  for (let i = 0; i < 100; i++) {
    const payload = generateEventPayload();
    http.post(
      "http://host.docker.internal:3000/event",
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json" } }
    );
  }
  // Проверяем доступность archive эндпоинта
  const testPayload = {
    timeInterval: { start: "2024-04-01", end: "2024-12-01" },
  };
  let response = http.post(
    "http://host.docker.internal:3000/archive/events",
    JSON.stringify(testPayload),
    { headers: { "Content-Type": "application/json" } }
  );
  if (response.status !== 200) {
    console.warn(
      `Предупреждение: archive эндпоинт отвечает со статусом ${response.status}`
    );
  } else {
    console.log("Archive эндпоинт доступен и работает корректно");
  }
  return {
    startTime: new Date().toISOString(),
    targetUrl: "http://host.docker.internal:3000/archive/events",
    minDate,
    maxDate,
  };
}

export default function () {
  // Отправляем событие на /event
  const eventPayload = generateEventPayload();
  let eventResponse = http.post(
    "http://host.docker.internal:3000/event",
    JSON.stringify(eventPayload),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "event", test_scenario: "load_test" },
    }
  );

  check(eventResponse, {
    "event status is 200": (r) => r.status === 200,
    "event response time < 500ms": (r) => r.timings.duration < 500,
    "event content type is JSON": (r) =>
      r.headers["Content-Type"] &&
      r.headers["Content-Type"].includes("application/json"),
    "event response is valid JSON": (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  // Для 10% виртуальных пользователей отправляем запрос на архивацию
  if (Math.random() < 0.1) {
    const archivePayload = generateArchivePayload();
    if (archivePayload) {
      let archiveResponse = http.post(
        "http://host.docker.internal:3000/archive/events",
        JSON.stringify(archivePayload),
        {
          headers: { "Content-Type": "application/json" },
          tags: { endpoint: "archive", test_scenario: "load_test" },
        }
      );

      let archiveChecks = check(archiveResponse, {
        "archive status is 200": (r) => r.status === 200,
        "archive response time < 1000ms": (r) => r.timings.duration < 1000,
        "archive content type is JSON": (r) =>
          r.headers["Content-Type"] &&
          r.headers["Content-Type"].includes("application/json"),
        "archive response is valid JSON": (r) => {
          try {
            const body = JSON.parse(r.body);
            return !!body.archiveUrl; // Проверяем наличие archiveUrl
          } catch (e) {
            return false;
          }
        },
      });

      // Если архивация успешна, скачиваем архив
      if (archiveChecks) {
        try {
          const archiveBody = JSON.parse(archiveResponse.body);
          if (archiveBody.archiveUrl) {
            let downloadResponse = http.get(archiveBody.archiveUrl, {
              tags: { endpoint: "download", test_scenario: "load_test" },
            });
            check(downloadResponse, {
              "download status is 200": (r) => r.status === 200,
              "download response time < 60000ms": (r) =>
                r.timings.duration < 60000,
            });
          }
        } catch (e) {
          console.error(`Ошибка парсинга archive response: ${e}`);
        }
      }
    }
  }

  sleep(1);
}

export function teardown(data) {
  console.log("Тестирование завершено.");
  console.log(`URL: ${data.targetUrl}`);
  console.log(`Время начала: ${data.startTime}`);
  console.log(`Время завершения: ${new Date().toISOString()}`);
}
