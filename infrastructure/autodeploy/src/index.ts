import { exit } from "node:process";

import { select } from "@inquirer/prompts";

import { initialize } from "./features/initialize/index.ts";
import { openManageMonolithMenu } from "./features/manageMonolith/index.ts";
import { openManageServerlessMonolithMenu } from "./features/manageServerlessMonolith/openManageServerlessMonolithMenu.ts";

console.log("⚙️ Инициализация");
await initialize();

while (true) {
  const choice = await select({
    message: "Выберите действие:",
    choices: [
      { name: "Управление монолитной версией системы", value: "monolith" },
      {
        name: "Управление монолитной версией системы (с бессерверными функциями)",
        value: "serverless-monolith",
      },
      { name: "Выход", value: "exit" },
    ],
  });

  try {
    switch (choice) {
      case "monolith":
        await openManageMonolithMenu();
        break;
      case "serverless-monolith":
        await openManageServerlessMonolithMenu();
        break;
      case "exit":
        exit();
    }
  } catch (error) {
    console.error(error);
  }
}
