import { existsSync } from "node:fs";

import { serviceAccounts } from "../../constants/serviceAccounts.ts";
import { createServiceAccountKey } from "../../integration/YandexCloud/features/iamKey/index.ts";
import { getCatalogInfoByID } from "../../integration/YandexCloud/features/manageCatalog/index.ts";
import { activateProfileWithConfig } from "../../integration/YandexCloud/features/manageProfile/activateProfile.ts";
import { getOrCreateAccount } from "../../integration/YandexCloud/features/manageServiceAccount/getOrCreateAccount.ts";

const SERVICE_ACCOUNT_KEY_FILE_NAME = "key.json";

export async function activateEditorAccountProfile() {
  const editorAccount = await getOrCreateAccount({
    name: serviceAccounts.catalogEditor,
    roles: ["editor"],
  });

  const catalog = await getCatalogInfoByID(editorAccount.folder_id);

  if (!existsSync(SERVICE_ACCOUNT_KEY_FILE_NAME)) {
    console.log("🔑 Создание ключа авторизации");

    await createServiceAccountKey({
      serviceAccountID: editorAccount.id,
      catalogName: catalog.name,
      fileName: SERVICE_ACCOUNT_KEY_FILE_NAME,
    });
  }

  await activateProfileWithConfig({
    name: serviceAccounts.catalogEditor,
    keyPath: SERVICE_ACCOUNT_KEY_FILE_NAME,
    cloudId: catalog.cloud_id,
    folderId: catalog.id,
  });
}
