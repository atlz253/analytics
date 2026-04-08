import { exit } from "node:process";

import { select } from "@inquirer/prompts";

import { initialize } from "./features/initialize/index.ts";
import { openManageMonolithMenu } from "./features/manageMonolith/index.ts";

console.log("⚙️ Инициализация");
await initialize();

while (true) {
  const choice = await select({
    message: "Выберите действие:",
    choices: [
      { name: "Управление монолитной версией системы", value: "monolith" },
      { name: "Выход", value: "exit" },
    ],
  });

  switch (choice) {
    case "monolith":
      await openManageMonolithMenu();
      break;
    case "exit":
      exit();
  }
}
