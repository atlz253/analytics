import { select } from "@inquirer/prompts";

import { apply, destroy } from "./index.ts";

export async function openManageServerlessMenu() {
  while (true) {
    const choice = await select({
      message: "Выберите действие с бессерверным вариантом системы:",
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
