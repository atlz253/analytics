import { readFile, writeFile } from "node:fs/promises";

import { instanceNames } from "../../constants/instanceNames.ts";
import { serviceAccounts } from "../../constants/serviceAccounts.ts";
import { buildImage } from "../../integration/Docker/features/buildImage/index.ts";
import { pushImage } from "../../integration/Docker/features/pushImage/index.ts";
import { apply as applyTerraform } from "../../integration/Terraform/features/apply/index.ts";
import { DEFAULT_PROFILE_NAME } from "../../integration/YandexCloud/constants/index.ts";
import {
  createCurrentProfileIAMToken,
  createStaticAccessKey,
} from "../../integration/YandexCloud/features/iamKey/index.ts";
import { setServiceAccount } from "../../integration/YandexCloud/features/manageComputeCloud/index.ts";
import { activateProfile } from "../../integration/YandexCloud/features/manageProfile/index.ts";
import { getOrCreateAccount } from "../../integration/YandexCloud/features/manageServiceAccount/getOrCreateAccount.ts";
import { activateEditorAccountProfile } from "../manageEditorAccount/index.ts";

export async function apply() {
  await activateEditorAccountProfile();

  type ApplyResult = {
    "container-registry": {
      registry_id: string;
    };
    "mongo-events": {
      name: string;
    };
  };

  const applyResult = (await applyTerraform({
    cwd: "/app/terraform/monolith",
    autoApprove: true,
  })) as ApplyResult;
  const registryId = applyResult["container-registry"]["registry_id"];
  const mongoHostName = applyResult["mongo-events"]["name"];

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
