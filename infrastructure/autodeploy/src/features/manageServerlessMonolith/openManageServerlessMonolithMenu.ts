import { select } from "@inquirer/prompts";

import { apply, destroy } from "./index.ts";

export async function openManageServerlessMonolithMenu() {
  while (true) {
    const choice = await select({
      message:
        "Выбреите действие с монолитным вариантом системы (с бессерверными функциями):",
      choices: [
        {
          name: "Развернуть инфраструктуру",
          value: "apply",
        },
        {
          name: "Свернуть инфраструктуру",
          value: "destroy",
        },
        {
          name: "Назад",
          value: "back",
        },
      ],
    });

    switch (choice) {
      case "apply":
        await apply();
        break;
      case "destroy":
        await destroy();
        break;
      case "back":
        return;
    }
  }
}
