import { instanceNames, serviceAccounts } from "../../constants/index.ts";
import { destroy as destroyTerraform } from "../../integration/Terraform/features/destroy/index.ts";
import { DEFAULT_PROFILE_NAME } from "../../integration/YandexCloud/constants/index.ts";
import { createCurrentProfileIAMToken } from "../../integration/YandexCloud/features/iamKey/index.ts";
import {
  deleteImage,
  getImagesList,
  getRegistryInfoByName,
} from "../../integration/YandexCloud/features/manageContainerRegistry/index.ts";
import { remove as removeFromS3 } from "../../integration/YandexCloud/features/manageObjectStorage/remove.ts";
import { activateProfile } from "../../integration/YandexCloud/features/manageProfile/index.ts";
import { getOrCreateAccount } from "../../integration/YandexCloud/features/manageServiceAccount/index.ts";
import { activateEditorAccountProfile } from "../manageEditorAccount/index.ts";

export async function destroy() {
  console.log("🔑 Получения токена авторизации");
  await activateProfile(DEFAULT_PROFILE_NAME);
  const defaultProfileIAMToken = await createCurrentProfileIAMToken();

  await activateProfile(DEFAULT_PROFILE_NAME);
  const editorAccount = await getOrCreateAccount({
    name: serviceAccounts.catalogEditor,
    roles: ["admin"],
  });

  await activateEditorAccountProfile();

  const registryInfo = await getRegistryInfoByName({
    catalogId: editorAccount.folder_id,
    name: instanceNames.containerRegistry,
    iamToken: defaultProfileIAMToken,
  });

  if (registryInfo) {
    console.log("🗑️ Удаление образов из Container registry");

    const { images } = await getImagesList({
      registryId: registryInfo.id,
      iamToken: defaultProfileIAMToken,
    });

    if (images) {
      await Promise.all(
        images.map((i) =>
          deleteImage({ imageId: i.id, iamToken: defaultProfileIAMToken }),
        ),
      );
    }
  }

  console.log("🗑️ Удаление данных из Object Storage");

  try {
    await removeFromS3({
      URI: `s3://${instanceNames.objectStorage}/`,
      recursive: true,
    });
  } catch (error) {
    console.error(error);
  }

  console.log("🗑️ Удаление бессерверных функций");

  try {
    await destroyTerraform({
      cwd: "/app/terraform/serverless-monolith-functions",
      autoApprove: true,
    });
  } catch (error) {
    console.log(error);
  }

  console.log("🗑️ Удаление сервисов");

  await destroyTerraform({
    cwd: "/app/terraform/serverless-monolith",
    autoApprove: true,
  });
}
