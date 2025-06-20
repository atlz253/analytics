import http from "k6/http";
import { check, sleep } from "k6";

// Настройки тестирования
export let options = {
  stages: [
    { duration: "5m", target: 1000 },
    { duration: "5m", target: 1500 },
    { duration: "5m", target: 0 },
  ],

  // Пороговые значения для определения успешности теста
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% запросов должны выполняться менее чем за 500 мс
    http_req_failed: ["rate<0.1"], // Менее 10% запросов должны завершаться ошибкой
  },

  // Настройки для вывода в InfluxDB 2.x
  ext: {
    loadimpact: {
      projectID: "event-test-project",
      name: "Event Endpoint Performance Test",
    },
  },
};

// Генерация случайных данных для тела запроса
function generateEventData() {
  // Список возможных значений для полей
  const eventTypes = ["scroll", "click", "view"];
  const pages = ["catalog", "home", "product", "cart"];

  // Генерация случайного UUID
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Генерация случайной даты в диапазоне 2025 года
  const randomDate = () => {
    const start = new Date("2025-01-01T00:00:00.000Z");
    const end = new Date("2025-12-31T23:59:59.999Z");
    const randomTime =
      start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime).toISOString();
  };

  return {
    eventType: "userActivity", // Фиксированное значение
    occurrenceTime: randomDate(),
    type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    userUUID: generateUUID(),
    page: pages[Math.floor(Math.random() * pages.length)],
  };
}

// Основная функция тестирования
export default function () {
  // Генерируем данные для запроса
  const payload = generateEventData();

  // Отправляем POST-запрос на эндпоинт /event
  let response = http.post(
    "http://host.docker.internal:3000/event",
    JSON.stringify(payload),
    {
      headers: { "Content-Type": "application/json" },
      tags: {
        endpoint: "event",
        test_scenario: "load_test",
      },
    }
  );

  // Проверка статуса и содержимого ответа
  let checksResult = check(
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
        } catch (e) {
          return false;
        }
      },
    },
    {
      endpoint: "event",
      test_type: "performance",
    }
  );

  // Логируем неудачные проверки для отладки
  if (!checksResult) {
    console.error(`Failed check for VU ${__VU}, iteration ${__ITER}`);
    console.error(`Response status: ${response.status}`);
    console.error(`Response body: ${response.body}`);
  }

  // Пауза между запросами (имитация поведения пользователя)
  sleep(1);
}

// Функция настройки (выполняется один раз перед тестом)
export function setup() {
  console.log("Начало нагрузочного тестирования event эндпоинта...");

  // Проверяем доступность event эндпоинта
  const testPayload = {
    eventType: "userActivity",
    occurrenceTime: new Date().toISOString(),
    type: "scroll",
    userUUID: "b8c5d9e0-2f3a-5678-9012-345678901bcd",
    page: "catalog",
  };

  let response = http.post(
    "http://host.docker.internal:3000/event",
    JSON.stringify(testPayload),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  if (response.status !== 200) {
    console.warn(
      `Предупреждение: event эндпоинт отвечает со статусом ${response.status}`
    );
    console.warn(`Ответ: ${response.body}`);
  } else {
    console.log("Event эндпоинт доступен и работает корректно");
    try {
      const body = JSON.parse(response.body);
      console.log(`Получен ответ: ${JSON.stringify(body)}`);
    } catch (e) {
      console.warn("Ответ не является валидным JSON");
    }
  }

  return {
    startTime: new Date().toISOString(),
    targetUrl: "http://host.docker.internal:3000/event",
  };
}

// Функция завершения (выполняется один раз после теста)
export function teardown(data) {
  console.log("Тестирование завершено.");
  console.log(`URL: ${data.targetUrl}`);
  console.log(`Время начала: ${data.startTime}`);
  console.log(`Время завершения: ${new Date().toISOString()}`);
}
