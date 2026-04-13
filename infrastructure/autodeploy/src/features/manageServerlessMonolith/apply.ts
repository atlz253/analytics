import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

import { execa } from "execa";

import { instanceNames, serviceAccounts } from "../../constants/index.ts";
import { db } from "../../db/index.ts";
import { buildImage } from "../../integration/Docker/features/buildImage/index.ts";
import { pushImage } from "../../integration/Docker/features/pushImage/index.ts";
import { apply as applyTerraform } from "../../integration/Terraform/features/apply/index.ts";
import { output as getTerraformOutput } from "../../integration/Terraform/features/getOutput/index.ts";
import { init as initTerraform } from "../../integration/Terraform/features/init/index.ts";
import { DEFAULT_PROFILE_NAME } from "../../integration/YandexCloud/constants/index.ts";
import { getCurrentConfig } from "../../integration/YandexCloud/features/config/getCurrentConfig.ts";
import {
  createCurrentProfileIAMToken,
  createStaticAccessKey,
} from "../../integration/YandexCloud/features/iamKey/index.ts";
import { setServiceAccount } from "../../integration/YandexCloud/features/manageComputeCloud/index.ts";
import { activateProfile } from "../../integration/YandexCloud/features/manageProfile/index.ts";
import { getOrCreateAccount } from "../../integration/YandexCloud/features/manageServiceAccount/index.ts";
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
  "report-queue-request-url": {
    value: {
      url: string;
      arn: string;
    };
  };
  "report-queue-response-url": {
    value: {
      url: string;
      arn: string;
    };
  };
  "archive-queue-request-url": {
    value: {
      url: string;
      arn: string;
    };
  };
  "archive-queue-response-url": {
    value: {
      url: string;
      arn: string;
    };
  };
  "queues-service-account": {
    value: {
      id: string;
      access_key: string;
      secret_key: string;
    };
  };
};

export async function apply() {
  if (!db.data.monolith.isTerraformInitialized) {
    console.log("⚙️ Инициализация Terraform");
    const terraformConfig = await readFile(
      "/app/terraform/templates/serverless-monolith.tf",
      "utf-8",
    );

    const currentConfig = await getCurrentConfig();
    const editedTerraformConfig = terraformConfig.replace(
      "<идентификатор_каталога>",
      currentConfig["folder-id"],
    );

    if (!existsSync("/app/terraform/serverless-monolith")) {
      await mkdir("/app/terraform/serverless-monolith");
    }

    await writeFile(
      "/app/terraform/serverless-monolith/main.tf",
      editedTerraformConfig,
    );

    await initTerraform({ cwd: "/app/terraform/serverless-monolith" });
    await db.update(
      ({ serverlessMonolith }) =>
        (serverlessMonolith.isTerraformInitialized = true),
    );
  }

  if (!existsSync("/app/terraform/serverless-monolith/cloud-config.yml")) {
    const cloudConfig = await readFile(
      "/app/terraform/cloud-config.example.yml",
      "utf-8",
    );

    const editedCloudConfig = cloudConfig
      .replace("<имя пользователя>", db.data.ssh.user)
      .replace("<публичный SSH ключ>", db.data.ssh.key);

    await writeFile(
      "/app/terraform/serverless-monolith/cloud-config.yml",
      editedCloudConfig,
    );
  }

  if (!existsSync("/app/terraform/serverless-monolith/declaration.yml")) {
    await copyFile(
      "/app/terraform/declaration.example.yml",
      "/app/terraform/serverless-monolith/declaration.yml",
    );
  }

  await activateEditorAccountProfile();

  await applyTerraform({
    cwd: "/app/terraform/serverless-monolith",
    autoApprove: true,
  });
  const applyResult = JSON.parse(
    await getTerraformOutput({
      jsonOutput: true,
      cwd: "/app/terraform/serverless-monolith",
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
    "/app/analytics/packages/monolith/.env.yandex.serverless.local.example",
    "utf-8",
  );

  const editedDockerVMEnv = dockerVMEnv
    .replace("<адрес_хоста>", mongoHostName)
    .replace("<access_key_id>", storageEditorStaticKeyInfo.access_key.key_id)
    .replace("<secret_access_key_id>", storageEditorStaticKeyInfo.secret)
    .replace(
      "<report_queue_request_url>",
      applyResult["report-queue-request-url"]["value"].url,
    )
    .replace(
      "<report_queue_response_url>",
      applyResult["report-queue-response-url"]["value"].url,
    )
    .replace(
      "<report_queue_access_key_id>",
      applyResult["queues-service-account"]["value"].access_key,
    )
    .replace(
      "<report_queue_secret_access_key>",
      applyResult["queues-service-account"]["value"].secret_key,
    )
    .replace(
      "<archive_queue_request_url>",
      applyResult["archive-queue-request-url"]["value"].url,
    )
    .replace(
      "<archive_queue_response_url>",
      applyResult["archive-queue-response-url"]["value"].url,
    );

  await writeFile(
    "/app/analytics/packages/monolith/.env.yandex.serverless.local",
    editedDockerVMEnv,
  );

  await buildImage({
    cwd: "/app/analytics",
    dockerFile: "Dockerfile.monolith.release.yandex.serverless",
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
    "/app/terraform/serverless-monolith/declaration.yml",
    editedDockerVMDeclaration,
  );

  await applyTerraform({
    cwd: "/app/terraform/serverless-monolith",
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

  console.log("🛠️ Сборка бессерверных функций модуля отчетов");

  const reportFunctionEnv = await readFile(
    "/app/analytics/packages/report/cloud-function/.env",
    "utf8",
  );

  const editedReportFunctionEnv = reportFunctionEnv
    .replace("<адрес_хоста>", mongoHostName)
    .replace(
      "<report_queue_access_key_id>",
      applyResult["queues-service-account"]["value"].access_key,
    )
    .replace(
      "<report_queue_secret_access_key>",
      applyResult["queues-service-account"]["value"].secret_key,
    )
    .replace(
      "<report_queue_response_url>",
      applyResult["report-queue-response-url"]["value"].url,
    );

  await writeFile(
    "/app/analytics/packages/report/cloud-function/.env.local",
    editedReportFunctionEnv,
  );

  await execa("npm", ["run", "serverless.build"], {
    cwd: "/app/analytics/packages/report",
    stdio: "inherit",
  });

  if (!existsSync("/app/terraform/serverless-monolith-functions")) {
    await mkdir("/app/terraform/serverless-monolith-functions");
  }

  await copyFile(
    "/app/analytics/packages/report/dist/cloud-function/index.zip",
    "/app/terraform/serverless-monolith-functions/dist.zip",
  );

  console.log("🛠️ Сборка бессерверных функций модуля архивации");

  const archiveFunctionEnv = await readFile(
    "/app/analytics/packages/archive/cloud-function/.env",
    "utf8",
  );

  const editedArchiveFunctionEnv = archiveFunctionEnv
    .replace("<адрес_хоста>", mongoHostName)
    .replace(
      "<archive_queue_access_key_id>",
      applyResult["queues-service-account"].value.access_key,
    )
    .replace(
      "<archive_queue_secret_access_key>",
      applyResult["queues-service-account"].value.secret_key,
    )
    .replace(
      "<archive_queue_response_url>",
      applyResult["archive-queue-response-url"].value.url,
    )
    .replace("<ys3_access_key>", storageEditorStaticKeyInfo.access_key.key_id)
    .replace("<ys3_secret_access_key>", storageEditorStaticKeyInfo.secret);

  await writeFile(
    "/app/analytics/packages/archive/cloud-function/.env.local",
    editedArchiveFunctionEnv,
  );

  await execa("npm", ["run", "serverless.build"], {
    cwd: "/app/analytics/packages/archive",
    stdio: "inherit",
  });

  await copyFile(
    "/app/analytics/packages/archive/dist/cloud-function/index.zip",
    "/app/terraform/serverless-monolith-functions/dist-archive.zip",
  );

  console.log("☁️ Развертывание бессерверных функций");

  const functionsTerraform = await readFile(
    "/app/terraform/templates/serverless-monolith-functions.tf",
    "utf-8",
  );

  const editedFunctionsTerraform = functionsTerraform
    .replace(
      "<report_queue_id>",
      applyResult["report-queue-request-url"]["value"].arn,
    )
    .replace(
      "<archive_queue_id>",
      applyResult["archive-queue-request-url"]["value"].arn,
    )
    .replaceAll(
      "<queues_service_account_id>",
      applyResult["queues-service-account"]["value"].id,
    );

  await writeFile(
    "/app/terraform/serverless-monolith-functions/main.tf",
    editedFunctionsTerraform,
  );

  if (!db.data.serverlessMonolith.isServerlessFunctionsTerraformInitialized) {
    await initTerraform({
      cwd: "/app/terraform/serverless-monolith-functions",
    });
    db.update(
      ({ serverlessMonolith }) =>
        (serverlessMonolith.isServerlessFunctionsTerraformInitialized = true),
    );
  }

  await applyTerraform({
    cwd: "/app/terraform/serverless-monolith-functions",
    autoApprove: true,
  });
}
