import { input } from "@inquirer/prompts";
import { configDotenv } from "dotenv";

import { serviceAccounts } from "../../constants/index.ts";
import { db } from "../../db/index.ts";
import { DEFAULT_PROFILE_NAME } from "../../integration/YandexCloud/constants/index.ts";
import {
  setAuthToken,
  setCloudId,
  setFolderId,
} from "../../integration/YandexCloud/features/config/index.ts";
import { createCurrentProfileIAMToken } from "../../integration/YandexCloud/features/iamKey/index.ts";
import {
  init as ycInit,
  isHaveBeenInitialized as isYcHaveBeenInitialized,
} from "../../integration/YandexCloud/features/init/index.ts";
import { getCatalogInfoByID } from "../../integration/YandexCloud/features/manageCatalog/index.ts";
import { activateProfile } from "../../integration/YandexCloud/features/manageProfile/index.ts";
import { getOrCreateAccount } from "../../integration/YandexCloud/features/manageServiceAccount/index.ts";
import { activateEditorAccountProfile } from "../manageEditorAccount/index.ts";

export async function initialize() {
  configDotenv({ quiet: true });

  process.env.YC_CLI_INITIALIZATION_SILENCE = "true";

  if (!isYcHaveBeenInitialized()) {
    console.log("⚙️ Инициализация Yandex Cloud");

    if (process.env.YA_AUTH_KEY) {
      await setAuthToken(process.env.YA_AUTH_KEY);
    }

    if (process.env.YA_CLOUD_ID) {
      await setCloudId(process.env.YA_CLOUD_ID);
    }

    if (process.env.YA_CATALOG_ID) {
      await setFolderId(process.env.YA_CATALOG_ID);
    }

    const isYcFullyInitialized = Boolean(
      process.env.YA_AUTH_KEY &&
      process.env.YA_CLOUD_ID &&
      process.env.YA_CATALOG_ID,
    );

    if (!isYcFullyInitialized) {
      await ycInit();
    } else {
      await activateProfile(DEFAULT_PROFILE_NAME);
    }
  }

  console.log("🤖 Настройка сервисных аккаунтов");

  const editorAccount = await getOrCreateAccount({
    name: serviceAccounts.catalogEditor,
    roles: ["admin"],
  });

  await activateEditorAccountProfile();

  const catalog = await getCatalogInfoByID(editorAccount.folder_id);

  console.log("🔑 Установка переменных среды");
  const YC_TOKEN = await createCurrentProfileIAMToken();

  process.env.YC_TOKEN = YC_TOKEN;
  process.env.YC_CLOUD_ID = catalog.cloud_id;
  process.env.YC_FOLDER_ID = catalog.id;

  await activateProfile(DEFAULT_PROFILE_NAME);

  if (db.data.ssh.key === "" || db.data.ssh.user === "") {
    console.log("⚙️ Настройка SSH-доступа");

    const SSH_KEY = process.env.PUBLIC_SSH_KEY
      ? process.env.PUBLIC_SSH_KEY
      : await input({ message: "Введите публичный SSH ключ: " });
    const USER_NAME = process.env.USER_NAME
      ? process.env.USER_NAME
      : await input({
          message: "Введите имя пользователя вашего компьютера: ",
        });

    await db.update(({ ssh }) => {
      ssh.key = SSH_KEY;
      ssh.user = USER_NAME;
    });
  }
}
