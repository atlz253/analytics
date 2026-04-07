import { existsSync } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";

import { input, select } from "@inquirer/prompts";
import { configDotenv } from "dotenv";

import { buildImage } from "./integration/Docker/features/buildImage/index.ts";
import { pushImage } from "./integration/Docker/features/pushImage/index.ts";
import { apply } from "./integration/Terraform/features/apply/index.ts";
import { destroy } from "./integration/Terraform/features/destroy/index.ts";
import {
  init as terraformInit,
  isHaveBeenInitialized as isTerraformHaveBeenInitialized,
} from "./integration/Terraform/features/init/index.ts";
import {
  setAuthToken,
  setCloudId,
  setFolderId,
  setServiceAccountKey,
} from "./integration/YandexCloud/features/config/index.ts";
import {
  createCurrentProfileIAMToken,
  createServiceAccountKey,
  createStaticAccessKey,
} from "./integration/YandexCloud/features/iamKey/index.ts";
import {
  init as ycInit,
  isHaveBeenInitialized as isYcHaveBeenInitialized,
} from "./integration/YandexCloud/features/init/index.ts";
import { getCatalogInfoByID } from "./integration/YandexCloud/features/manageCatalog/index.ts";
import { setServiceAccount } from "./integration/YandexCloud/features/manageComputeCloud/index.ts";
import {
  deleteImage,
  getImagesList,
  getRegistryInfoByName,
} from "./integration/YandexCloud/features/manageContainerRegistry/index.ts";
import { remove as removeFromS3 } from "./integration/YandexCloud/features/manageObjectStorage/index.ts";
import {
  activateProfile,
  createProfile,
  isProfileWithNameExists,
} from "./integration/YandexCloud/features/manageProfile/index.ts";
import {
  addServiceAccountCatalogRole,
  createServiceAccount,
  getServiceAccountInfoWithName,
  isServiceAccountWithNameExists,
} from "./integration/YandexCloud/features/manageServiceAccount/index.ts";

configDotenv({ quiet: true });

process.env.YC_CLI_INITIALIZATION_SILENCE = "true";

const SERVICE_ACCOUNT_PREFIX = "autodeploy";
const CATALOG_EDITOR_SERVICE_ACCOUNT_NAME = `${SERVICE_ACCOUNT_PREFIX}-catalog-editor`;
const DOCKER_IMAGE_PULLER_SERVICE_ACCOUNT_NAME = `${SERVICE_ACCOUNT_PREFIX}-image-puller`;
const STORAGE_EDITOR_SERVICE_ACCOUNT_NAME = `${SERVICE_ACCOUNT_PREFIX}-storage-editor`;

const DEFAULT_PROFILE_NAME = "default";

const SERVICE_ACCOUNT_FILE_NAME = "key.json";

const CONTAINER_OPTIMIZED_IMAGE_INSTANCE_NAME =
  "container-optimized-image-instance";
const CONTAINER_REGISTRY_INSTANCE_NAME = "container-registry";
const OBJECT_STORAGE_INSTANCE_NAME = "unique-bucket-name-1";

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
  }
}

console.log("🔑 Получения токена авторизации");
await activateProfile(DEFAULT_PROFILE_NAME);
const defaultProfileIAMToken = await createCurrentProfileIAMToken();

const isServiceAccountExists = await isServiceAccountWithNameExists(
  CATALOG_EDITOR_SERVICE_ACCOUNT_NAME,
);

console.log("🤖 Настройка сервисных аккаунтов");

if (!isServiceAccountExists) {
  console.log("🤖 Создание сервисного аккаунта с правами на редактирование");
}

const editorAccount = await (isServiceAccountExists
  ? getServiceAccountInfoWithName(CATALOG_EDITOR_SERVICE_ACCOUNT_NAME)
  : createServiceAccount({
      name: CATALOG_EDITOR_SERVICE_ACCOUNT_NAME,
    }));

await addServiceAccountCatalogRole({
  role: "editor",
  catalogID: editorAccount.folder_id,
  serviceAccountID: editorAccount.id,
});

const isImagePullerAccountExists = await isServiceAccountWithNameExists(
  DOCKER_IMAGE_PULLER_SERVICE_ACCOUNT_NAME,
);

if (!isImagePullerAccountExists) {
  console.log(
    "🐋 Создание сервисного аккаунта для работы с container registry",
  );
}

const imagePullerAccount = await (isImagePullerAccountExists
  ? getServiceAccountInfoWithName(DOCKER_IMAGE_PULLER_SERVICE_ACCOUNT_NAME)
  : createServiceAccount({ name: DOCKER_IMAGE_PULLER_SERVICE_ACCOUNT_NAME }));

await addServiceAccountCatalogRole({
  role: "container-registry.images.puller",
  catalogID: imagePullerAccount.folder_id,
  serviceAccountID: imagePullerAccount.id,
});

const isStorageEditorAccountExists = await isServiceAccountWithNameExists(
  STORAGE_EDITOR_SERVICE_ACCOUNT_NAME,
);

if (!isStorageEditorAccountExists) {
  console.log("🗄️ Создание аккаунта для редактирования Object Storage");
}

const storageEditorAccount = await (isStorageEditorAccountExists
  ? getServiceAccountInfoWithName(STORAGE_EDITOR_SERVICE_ACCOUNT_NAME)
  : createServiceAccount({ name: STORAGE_EDITOR_SERVICE_ACCOUNT_NAME }));

await Promise.all(
  ["kms.keys.encrypterDecrypter", "kms.keys.user", "storage.editor"].map(
    (role) =>
      addServiceAccountCatalogRole({
        role,
        catalogID: storageEditorAccount.folder_id,
        serviceAccountID: storageEditorAccount.id,
      }),
  ),
);

const catalog = await getCatalogInfoByID(editorAccount.folder_id);

if (!isServiceAccountExists || !existsSync("key.json")) {
  console.log("🔑 Создание ключа авторизации");

  await createServiceAccountKey({
    serviceAccountID: editorAccount.id,
    catalogName: catalog.name,
    fileName: SERVICE_ACCOUNT_FILE_NAME,
  });
}

const isServiceProfileExists = await isProfileWithNameExists(
  CATALOG_EDITOR_SERVICE_ACCOUNT_NAME,
);

if (!isServiceProfileExists) {
  console.log("👤 Создание профиля сервисного аккаунта");

  await createProfile(CATALOG_EDITOR_SERVICE_ACCOUNT_NAME);
  await setServiceAccountKey(SERVICE_ACCOUNT_FILE_NAME);
  await setCloudId(catalog.cloud_id);
  await setFolderId(catalog.id);
} else {
  console.log("👤 Активация профиля сервисного аккаунта");

  await activateProfile(CATALOG_EDITOR_SERVICE_ACCOUNT_NAME);
}

console.log("🔑 Установка переменных среды");
const YC_TOKEN = await createCurrentProfileIAMToken();

process.env.YC_TOKEN = YC_TOKEN;
process.env.YC_CLOUD_ID = catalog.cloud_id;
process.env.YC_FOLDER_ID = catalog.id;

if (!isTerraformHaveBeenInitialized()) {
  console.log("⚙️ Инициализация Terraform");
  await terraformInit({ cwd: "/app/terraform/monolith" });
}

if (!existsSync("/app/terraform/monolith/cloud-config.yml")) {
  console.log("⚙️ Настройка SSH-доступа");

  const SSH_KEY = process.env.PUBLIC_SSH_KEY
    ? process.env.PUBLIC_SSH_KEY
    : await input({ message: "Введите публичный SSH ключ: " });
  const USER_NAME = process.env.USER_NAME
    ? process.env.USER_NAME
    : await input({ message: "Введите имя пользователя вашего компьютера: " });

  const cloudConfig = await readFile(
    "/app/terraform/cloud-config.example.yml",
    "utf-8",
  );

  const editedCloudConfig = cloudConfig
    .replace("<имя пользователя>", USER_NAME)
    .replace("<публичный SSH ключ>", SSH_KEY);

  await writeFile(
    "/app/terraform/monolith/cloud-config.yml",
    editedCloudConfig,
  );
}

if (!existsSync("/app/terraform/monolith/declaration.yml")) {
  await copyFile(
    "/app/terraform/declaration.example.yml",
    "/app/terraform/monolith/declaration.yml",
  );
}

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
  type ApplyResult = {
    "container-registry": {
      registry_id: string;
    };
    "mongo-events": {
      name: string;
    };
  };

  const applyResult = (await apply({
    cwd: "/app/terraform/monolith",
    autoApprove: true,
  })) as ApplyResult;
  const registryId = applyResult["container-registry"]["registry_id"];
  const mongoHostName = applyResult["mongo-events"]["name"];

  console.log("🐋 Сборка Docker image с монолитной версией системы");

  const containerTag = `cr.yandex/${registryId}/analytics:1.0.0`;

  const storageEditorStaticKeyInfo = await createStaticAccessKey(
    STORAGE_EDITOR_SERVICE_ACCOUNT_NAME,
  );

  const dockerVMEnv = await readFile(
    "/app/analytics/packages/monolith/.env.yandex.local.example",
    "utf-8",
  );

  const editedDockerVMEnv = dockerVMEnv
    .replace("<адрес_хоста>", mongoHostName)
    .replace("<access_key_id>", storageEditorStaticKeyInfo.access_key.key_id)
    .replace("<secret_access_key_id>", storageEditorStaticKeyInfo.secret);

  await writeFile(
    "/app/analytics/packages/monolith/.env.yandex.local",
    editedDockerVMEnv,
  );

  await buildImage({
    cwd: "/app/analytics",
    dockerFile: "Dockerfile.monolith.release.yandex",
    tag: containerTag,
    noCache: true,
  });

  console.log("🐋 Публикация Docker image");

  await pushImage({ tag: containerTag, token: defaultProfileIAMToken });

  console.log("⚙️ Обновление конфигурации Container optimized image");

  const dockerVMDeclaration = await readFile(
    "/app/terraform/declaration.example.yml",
    "utf-8",
  );

  const editedDockerVMDeclaration = dockerVMDeclaration.replace(
    "<имя Docker-образа>",
    containerTag,
  );

  await writeFile(
    "/app/terraform/monolith/declaration.yml",
    editedDockerVMDeclaration,
  );

  await apply({
    cwd: "/app/terraform/monolith",
    autoApprove: true,
  });

  await setServiceAccount({
    instanceName: CONTAINER_OPTIMIZED_IMAGE_INSTANCE_NAME,
    serviceAccountName: imagePullerAccount.name,
  });
} else if (choice === "destroy") {
  console.log("🗑️ Удаление образов из Container registry");

  const registryInfo = await getRegistryInfoByName({
    catalogId: editorAccount.folder_id,
    name: CONTAINER_REGISTRY_INSTANCE_NAME,
    iamToken: defaultProfileIAMToken,
  });

  if (registryInfo === undefined)
    throw new Error(
      `Не удалось получить Container registry c названием ${CONTAINER_REGISTRY_INSTANCE_NAME}`,
    );

  const { images } = await getImagesList({
    registryId: registryInfo.id,
    iamToken: defaultProfileIAMToken,
  });

  if (images)
    await Promise.all(
      images.map((i) =>
        deleteImage({ imageId: i.id, iamToken: defaultProfileIAMToken }),
      ),
    );

  console.log("🗑️ Удаление данных из Object Storage");

  removeFromS3({
    URI: `s3://${OBJECT_STORAGE_INSTANCE_NAME}/`,
    recursive: true,
  });

  console.log("🗑️ Удаление сервисов");

  destroy({ cwd: "/app/terraform/monolith", autoApprove: true });
}
