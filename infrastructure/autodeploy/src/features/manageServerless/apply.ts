import { execa } from "execa";
import { existsSync } from "fs";
import { copyFile, mkdir, readFile, writeFile } from "fs/promises";

import { serviceAccounts } from "../../constants/index.ts";
import { db } from "../../db/index.ts";
import { apply as applyTerraform } from "../../integration/Terraform/features/apply/index.ts";
import { output as getTerraformOutput } from "../../integration/Terraform/features/getOutput/index.ts";
import { init as initTerraform } from "../../integration/Terraform/features/init/index.ts";
import { getCurrentConfig } from "../../integration/YandexCloud/features/config/index.ts";
import { createStaticAccessKey } from "../../integration/YandexCloud/features/iamKey/index.ts";
import { getOrCreateAccount } from "../../integration/YandexCloud/features/manageServiceAccount/index.ts";
import { activateEditorAccountProfile } from "../manageEditorAccount/index.ts";

type ApplyResult = {
  "mongo-events": {
    value: {
      name: string;
    };
  };
  "event-queue-request-url": {
    value: {
      url: string;
      arn: string;
    };
  };
  "event-queue-response-url": {
    value: {
      url: string;
      arn: string;
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
  const currentConfig = await getCurrentConfig();

  if (!db.data.serverless.isTerraformInitialized) {
    console.log("⚙️ Инициализация Terraform");
    const terraformConfig = await readFile(
      "/app/terraform/templates/serverless.tf",
      "utf-8",
    );

    const editedTerraformConfig = terraformConfig.replace(
      "<идентификатор_каталога>",
      currentConfig["folder-id"],
    );

    if (!existsSync("/app/terraform/serverless")) {
      await mkdir("/app/terraform/serverless");
    }

    await writeFile("/app/terraform/serverless/main.tf", editedTerraformConfig);

    await initTerraform({ cwd: "/app/terraform/serverless" });
    await db.update(
      ({ serverless }) => (serverless.isTerraformInitialized = true),
    );
  }

  if (!existsSync("/app/terraform/serverless/cloud-config.yml")) {
    const cloudConfig = await readFile(
      "/app/terraform/cloud-config.example.yml",
      "utf-8",
    );

    const editedCloudConfig = cloudConfig
      .replace("<имя пользователя>", db.data.ssh.user)
      .replace("<публичный SSH ключ>", db.data.ssh.key);

    await writeFile(
      "/app/terraform/serverless/cloud-config.yml",
      editedCloudConfig,
    );
  }

  await activateEditorAccountProfile();

  await applyTerraform({
    cwd: "/app/terraform/serverless",
    autoApprove: true,
  });
  const applyResult = JSON.parse(
    await getTerraformOutput({
      jsonOutput: true,
      cwd: "/app/terraform/serverless",
    }),
  ) as ApplyResult;

  const mongoHostName = applyResult["mongo-events"]["value"]["name"];

  console.log("🛠️ Сборка бессерверных функций модуля событий");

  const eventFunctionEnv = await readFile(
    "/app/analytics/packages/events/cloud-function/.env",
    "utf8",
  );

  const editedEventFunctionEnv = eventFunctionEnv
    .replace("<адрес_хоста>", mongoHostName)
    .replace(
      "<report_queue_access_key_id>",
      applyResult["queues-service-account"]["value"]["access_key"],
    )
    .replace(
      "<report_queue_secret_access_key>",
      applyResult["queues-service-account"]["value"]["secret_key"],
    )
    .replace(
      "<report_queue_response_url>",
      applyResult["event-queue-response-url"]["value"]["url"],
    );

  await writeFile(
    "/app/analytics/packages/events/cloud-function/.env.local",
    editedEventFunctionEnv,
  );

  await execa("npm", ["run", "serverless.build"], {
    cwd: "/app/analytics/packages/events",
    stdio: "inherit",
  });

  if (!existsSync("/app/terraform/serverless-functions")) {
    await mkdir("/app/terraform/serverless-functions");
  }

  await copyFile(
    "/app/analytics/packages/events/dist/cloud-function/index.zip",
    "/app/terraform/serverless-functions/dist-event.zip",
  );

  const eventRequestFunctionEnv = await readFile(
    "/app/analytics/packages/events/request-cloud-function/.env",
    "utf8",
  );

  const editedEventRequestFunctionEnv = eventRequestFunctionEnv
    .replace(
      "<report_queue_access_key_id>",
      applyResult["queues-service-account"]["value"]["access_key"],
    )
    .replace(
      "<report_queue_secret_access_key>",
      applyResult["queues-service-account"]["value"]["secret_key"],
    )
    .replace(
      "<request_queue_url>",
      applyResult["event-queue-request-url"]["value"]["url"],
    )
    .replace(
      "<response_queue_url>",
      applyResult["event-queue-response-url"]["value"]["url"],
    );

  await writeFile(
    "/app/analytics/packages/events/request-cloud-function/.env.local",
    editedEventRequestFunctionEnv,
  );

  await execa("npm", ["run", "serverless.request.build"], {
    cwd: "/app/analytics/packages/events",
    stdio: "inherit",
  });

  await copyFile(
    "/app/analytics/packages/events/dist/request-cloud-function/index.zip",
    "/app/terraform/serverless-functions/dist-event-request.zip",
  );

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

  await copyFile(
    "/app/analytics/packages/report/dist/cloud-function/index.zip",
    "/app/terraform/serverless-functions/dist.zip",
  );

  const reportRequestFunctionEnv = await readFile(
    "/app/analytics/packages/report/request-cloud-function/.env",
    "utf8",
  );

  const editedReportRequestFunctionEnv = reportRequestFunctionEnv
    .replace(
      "<queue_access_key_id>",
      applyResult["queues-service-account"]["value"]["access_key"],
    )
    .replace(
      "<queue_secret_access_key>",
      applyResult["queues-service-account"]["value"]["secret_key"],
    )
    .replace(
      "<request_queue_url>",
      applyResult["report-queue-request-url"]["value"]["url"],
    )
    .replace(
      "<response_queue_url>",
      applyResult["report-queue-response-url"]["value"]["url"],
    );

  await writeFile(
    "/app/analytics/packages/report/request-cloud-function/.env.local",
    editedReportRequestFunctionEnv,
  );

  await execa("npm", ["run", "serverless.request.build"], {
    cwd: "/app/analytics/packages/report",
    stdio: "inherit",
  });

  await copyFile(
    "/app/analytics/packages/report/dist/request-cloud-function/index.zip",
    "/app/terraform/serverless-functions/dist-report-request.zip",
  );

  console.log("🛠️ Сборка бессерверных функций модуля архивации");

  const archiveFunctionEnv = await readFile(
    "/app/analytics/packages/archive/cloud-function/.env",
    "utf8",
  );

  const storageEditorAccount = await getOrCreateAccount({
    name: serviceAccounts.storageEditor,
    roles: ["kms.keys.encrypterDecrypter", "kms.keys.user", "storage.editor"],
  });

  const storageEditorStaticKeyInfo = await createStaticAccessKey(
    storageEditorAccount.name,
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
    "/app/terraform/serverless-functions/dist-archive.zip",
  );

  const archiveRequestEnv = await readFile(
    "/app/analytics/packages/archive/request-cloud-function/.env",
    "utf8",
  );

  const editedArchiveRequestEnv = archiveRequestEnv
    .replace(
      "<report_queue_access_key_id>",
      applyResult["queues-service-account"]["value"]["access_key"],
    )
    .replace(
      "<report_queue_secret_access_key>",
      applyResult["queues-service-account"]["value"]["secret_key"],
    )
    .replace(
      "<request_queue_url>",
      applyResult["archive-queue-request-url"]["value"]["url"],
    )
    .replace(
      "<response_queue_url>",
      applyResult["archive-queue-response-url"]["value"]["url"],
    );

  await writeFile(
    "/app/analytics/packages/archive/request-cloud-function/.env.local",
    editedArchiveRequestEnv,
  );

  await execa("npm", ["run", "serverless.request.build"], {
    cwd: "/app/analytics/packages/archive",
    stdio: "inherit",
  });

  await copyFile(
    "/app/analytics/packages/archive/dist/request-cloud-function/index.zip",
    "/app/terraform/serverless-functions/dist-archive-request.zip",
  );

  console.log("☁️ Развертывание бессерверных функций");

  const functionsTerraform = await readFile(
    "/app/terraform/templates/serverless-functions.tf",
    "utf-8",
  );

  const editedFunctionsTerraform = functionsTerraform
    .replace("<идентификатор_каталога>", currentConfig["folder-id"])
    .replace(
      "<event_queue_id>",
      applyResult["event-queue-request-url"]["value"].arn,
    )
    .replace(
      "<report_queue_id>",
      applyResult["report-queue-request-url"]["value"]["arn"],
    )
    .replace(
      "<archive_queue_id>",
      applyResult["archive-queue-request-url"]["value"]["arn"],
    )
    .replaceAll(
      "<queues_service_account_id>",
      applyResult["queues-service-account"]["value"].id,
    );

  await writeFile(
    "/app/terraform/serverless-functions/main.tf",
    editedFunctionsTerraform,
  );

  if (!db.data.serverless.isServerlessFunctionsTerraformInitialized) {
    await initTerraform({
      cwd: "/app/terraform/serverless-functions",
    });
    db.update(
      ({ serverless }) =>
        (serverless.isServerlessFunctionsTerraformInitialized = true),
    );
  }

  await applyTerraform({
    cwd: "/app/terraform/serverless-functions",
    autoApprove: true,
  });
}
