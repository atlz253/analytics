import { select } from "@inquirer/prompts";

import { initialize } from "./features/initialize/index.ts";
import {
  apply as applyMonolith,
  destroy as destroyMonolith,
} from "./features/manageMonolith/index.ts";

console.log("⚙️ Инициализация");
await initialize();

const choice = await select({
  message: "Выбреите действие:",
  choices: [
    {
      name: "Развернуть монолитную версию системы",
      value: "monolith",
    },
    {
      name: "Свернуть инфраструктуру",
      value: "destroy",
    },
  ],
});

if (choice === "monolith") {
  await applyMonolith();
} else if (choice === "destroy") {
  await destroyMonolith();
}
