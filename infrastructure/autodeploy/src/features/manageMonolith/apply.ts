import { existsSync } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";

import { instanceNames } from "../../constants/instanceNames.ts";
import { serviceAccounts } from "../../constants/serviceAccounts.ts";
import { db } from "../../db/index.ts";
import { buildImage } from "../../integration/Docker/features/buildImage/index.ts";
import { pushImage } from "../../integration/Docker/features/pushImage/index.ts";
import { apply as applyTerraform } from "../../integration/Terraform/features/apply/index.ts";
import { output as getTerraformOutput } from "../../integration/Terraform/features/getOutput/index.ts";
import { init as initTerraform } from "../../integration/Terraform/features/init/index.ts";
import { DEFAULT_PROFILE_NAME } from "../../integration/YandexCloud/constants/index.ts";
import {
  createCurrentProfileIAMToken,
  createStaticAccessKey,
} from "../../integration/YandexCloud/features/iamKey/index.ts";
import { setServiceAccount } from "../../integration/YandexCloud/features/manageComputeCloud/index.ts";
import { activateProfile } from "../../integration/YandexCloud/features/manageProfile/index.ts";
import { getOrCreateAccount } from "../../integration/YandexCloud/features/manageServiceAccount/getOrCreateAccount.ts";
import { activateEditorAccountProfile } from "../manageEditorAccount/index.ts";

type ApplyResult = {
  "container-registry": {
    value: {
      registry_id: string;
    };
  };
  "mongo-events": {
    value: {
      name: string;
    };
  };
};

export async function apply() {
  if (!db.data.monolith.isTerraformInitialized) {
    console.log("⚙️ Инициализация Terraform");
    await initTerraform({ cwd: "/app/terraform/monolith" });
    await db.update(({ monolith }) => (monolith.isTerraformInitialized = true));
  }

  if (!existsSync("/app/terraform/monolith/cloud-config.yml")) {
    const cloudConfig = await readFile(
      "/app/terraform/cloud-config.example.yml",
      "utf-8",
    );

    const editedCloudConfig = cloudConfig
      .replace("<имя пользователя>", db.data.ssh.user)
      .replace("<публичный SSH ключ>", db.data.ssh.key);

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

  await activateEditorAccountProfile();

  await applyTerraform({
    cwd: "/app/terraform/monolith",
    autoApprove: true,
  });

  const applyResult = JSON.parse(
    await getTerraformOutput({
      jsonOutput: true,
      cwd: "/app/terraform/monolith",
    }),
  ) as ApplyResult;
  const registryId = applyResult["container-registry"]["value"]["registry_id"];
  const mongoHostName = applyResult["mongo-events"]["value"]["name"];

  console.log("🐋 Сборка Docker image с монолитной версией системы");

  const containerTag = `cr.yandex/${registryId}/analytics:1.0.0`;

  const storageEditorAccount = await getOrCreateAccount({
    name: serviceAccounts.storageEditor,
    roles: ["kms.keys.encrypterDecrypter", "kms.keys.user", "storage.editor"],
  });

  const storageEditorStaticKeyInfo = await createStaticAccessKey(
    storageEditorAccount.name,
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

  console.log("🔑 Получения токена авторизации");
  await activateProfile(DEFAULT_PROFILE_NAME);
  const defaultProfileIAMToken = await createCurrentProfileIAMToken();

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

  await applyTerraform({
    cwd: "/app/terraform/monolith",
    autoApprove: true,
  });

  const imagePullerAccount = await getOrCreateAccount({
    name: serviceAccounts.dockerImagePuller,
    roles: ["container-registry.images.puller"],
  });

  await setServiceAccount({
    instanceName: instanceNames.containerOptimizedImage,
    serviceAccountName: imagePullerAccount.name,
  });
}
