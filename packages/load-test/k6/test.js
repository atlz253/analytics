// Файл: k6-scripts/test.js
import http from "k6/http";
import { check, sleep } from "k6";

// Настройки тестирования
export let options = {
  // Сценарий нагрузочного тестирования
  stages: [
    { duration: "30s", target: 20 }, // Разогрев до 20 пользователей за 30 секунд
    { duration: "1m", target: 20 }, // Удержание 20 пользователей в течение 1 минуты
    { duration: "20s", target: 0 }, // Снижение до 0 пользователей за 20 секунд
  ],

  // Пороговые значения для определения успешности теста
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% запросов должны выполняться менее чем за 500мс
    http_req_failed: ["rate<0.1"], // Менее 10% запросов должны завершаться ошибкой
  },

  // Настройки для вывода в InfluxDB 2.x
  ext: {
    loadimpact: {
      projectID: "ping-test-project",
      name: "Ping Endpoint Performance Test",
    },
  },
};

// Основная функция тестирования
export default function () {
  // Тестируем ping эндпоинт (используем host.docker.internal для доступа к localhost из контейнера)
  let response = http.get("http://host.docker.internal:3000/ping", {
    tags: {
      endpoint: "ping",
      test_scenario: "load_test",
    },
  });

  // Проверка статуса и содержимого ответа
  let checksResult = check(
    response,
    {
      "status is 200": (r) => r.status === 200,
      "response time < 500ms": (r) => r.timings.duration < 500,
      "content type is JSON": (r) =>
        r.headers["Content-Type"] &&
        r.headers["Content-Type"].includes("application/json"),
      "response contains correct data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.statusCode === 200 && body.response === "pong";
        } catch (e) {
          return false;
        }
      },
    },
    {
      // Теги для группировки метрик
      endpoint: "ping",
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
  console.log("Начало нагрузочного тестирования ping эндпоинта...");

  // Проверяем доступность ping эндпоинта
  let response = http.get("http://host.docker.internal:3000/ping");
  if (response.status !== 200) {
    console.warn(
      `Предупреждение: ping эндпоинт отвечает со статусом ${response.status}`
    );
    console.warn(`Ответ: ${response.body}`);
  } else {
    console.log("Ping эндпоинт доступен и работает корректно");
    try {
      const body = JSON.parse(response.body);
      console.log(
        `Получен корректный ответ: statusCode=${body.statusCode}, response=${body.response}`
      );
    } catch (e) {
      console.warn("Ответ не является валидным JSON");
    }
  }

  return {
    startTime: new Date().toISOString(),
    targetUrl: "http://host.docker.internal:3000/ping",
  };
}

// Функция завершения (выполняется один раз после теста)
export function teardown(data) {
  console.log("Тестирование завершено.");
  console.log(`URL: ${data.targetUrl}`);
  console.log(`Время начала: ${data.startTime}`);
  console.log(`Время завершения: ${new Date().toISOString()}`);
}
