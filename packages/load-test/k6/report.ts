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
    "http_req_duration{endpoint:report_users}": ["p(95)<1000"],
    "http_req_duration{endpoint:report_user}": ["p(95)<1000"],
    "http_req_duration{endpoint:report_eventTypes}": ["p(95)<1000"],
    "http_req_duration{endpoint:report_events}": ["p(95)<1000"],
    "http_req_failed{endpoint:event}": ["rate<0.1"],
    "http_req_failed{endpoint:report_users}": ["rate<0.1"],
    "http_req_failed{endpoint:report_user}": ["rate<0.1"],
    "http_req_failed{endpoint:report_eventTypes}": ["rate<0.1"],
    "http_req_failed{endpoint:report_events}": ["rate<0.1"],
  },
  ext: {
    loadimpact: {
      projectID: "report-test-project",
      name: "Report Endpoint Stress Test",
    },
  },
};

// Global variables to track event timestamps
let minDate = null;
let maxDate = null;

function generateEventPayload() {
  const occurrenceTime = faker.date.between({
    from: "2024-01-01",
    to: "2024-12-31",
  });
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
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
}

function generateTimeIntervalPayload() {
  if (!minDate || !maxDate) return null;
  return {
    timeInterval: {
      start: formatDateYYYYMMDD(minDate),
      end: formatDateYYYYMMDD(maxDate),
    },
  };
}

export function setup() {
  console.log("Starting stress test for report endpoints...");
  // Send 100 initial events to create a data pool
  for (let i = 0; i < 100; i++) {
    const payload = generateEventPayload();
    http.post(
      "http://host.docker.internal:3000/event",
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json" } }
    );
  }
  return { minDate, maxDate };
}

export default function () {
  // Send an event to /event
  const eventPayload = generateEventPayload();
  let eventResponse = http.post(
    "http://host.docker.internal:3000/event",
    JSON.stringify(eventPayload),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "event" },
    }
  );
  check(eventResponse, { "event status is 200": (r) => r.status === 200 });

  // Execute report scenarios for 10% of virtual users
  if (Math.random() < 0.1) {
    const timeIntervalPayload = generateTimeIntervalPayload();
    if (!timeIntervalPayload) return;

    // Scenario 1: Fetch users and then a specific user
    let usersResponse = http.post(
      "http://host.docker.internal:3000/report/users",
      JSON.stringify(timeIntervalPayload),
      {
        headers: { "Content-Type": "application/json" },
        tags: { endpoint: "report_users" },
      }
    );
    if (
      check(usersResponse, {
        "report/users status is 200": (r) => r.status === 200,
      })
    ) {
      try {
        const usersBody = JSON.parse(usersResponse.body);
        const userUUIDs = Object.keys(usersBody.users);
        if (userUUIDs.length > 0) {
          const randomUUID =
            userUUIDs[Math.floor(Math.random() * userUUIDs.length)];
          const userPayload = {
            userUUID: randomUUID,
            timeInterval: timeIntervalPayload.timeInterval,
          };
          http.post(
            "http://host.docker.internal:3000/report/user",
            JSON.stringify(userPayload),
            {
              headers: { "Content-Type": "application/json" },
              tags: { endpoint: "report_user" },
            }
          );
        }
      } catch (e) {
        console.error(`Error parsing /report/users response: ${e}`);
      }
    }

    // Scenario 2: Fetch event types
    http.post(
      "http://host.docker.internal:3000/report/eventTypes",
      JSON.stringify(timeIntervalPayload),
      {
        headers: { "Content-Type": "application/json" },
        tags: { endpoint: "report_eventTypes" },
      }
    );

    // Scenario 3: Fetch events
    http.post(
      "http://host.docker.internal:3000/report/events",
      JSON.stringify(timeIntervalPayload),
      {
        headers: { "Content-Type": "application/json" },
        tags: { endpoint: "report_events" },
      }
    );
  }

  sleep(1);
}

export function teardown() {
  console.log("Stress test completed.");
}
