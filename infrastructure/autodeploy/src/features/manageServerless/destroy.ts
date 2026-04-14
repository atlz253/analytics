import { instanceNames } from "../../constants/index.ts";
import { destroy as destroyTerraform } from "../../integration/Terraform/features/destroy/index.ts";
import { remove as removeFromS3 } from "../../integration/YandexCloud/features/manageObjectStorage/index.ts";
import { activateEditorAccountProfile } from "../manageEditorAccount/index.ts";

export async function destroy() {
  await activateEditorAccountProfile();

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
      cwd: "/app/terraform/serverless-functions",
      autoApprove: true,
    });
  } catch (error) {
    console.log(error);
  }

  console.log("🗑️ Удаление сервисов");

  await destroyTerraform({
    cwd: "/app/terraform/serverless",
    autoApprove: true,
  });
}
