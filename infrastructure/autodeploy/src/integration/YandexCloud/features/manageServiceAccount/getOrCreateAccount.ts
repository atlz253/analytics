import { DEFAULT_PROFILE_NAME } from "../../constants/index.ts";
import {
  activateProfile,
  getCurrentProfileName,
} from "../manageProfile/index.ts";
import { addServiceAccountCatalogRoles } from "./addServiceAccountCatalogRole.ts";
import { createServiceAccount } from "./createServiceAccount.ts";
import { getServiceAccountInfoWithName } from "./getServiceAccountInfoWithName.ts";
import { isServiceAccountWithNameExists } from "./isServiceAccountWithNameExists.ts";

export async function getOrCreateAccount({
  name,
  roles,
}: {
  name: string;
  roles?: string[];
}) {
  const isExists = await isServiceAccountWithNameExists(name);
  if (isExists) {
    const result = await getServiceAccountInfoWithName(name);
    if (roles) {
      const currentProfileName = await getCurrentProfileName();
      await activateProfile(DEFAULT_PROFILE_NAME);
      await addServiceAccountCatalogRoles({
        roles,
        catalogID: result.folder_id,
        serviceAccountID: result.id,
      });
      await activateProfile(currentProfileName);
    }
    return result;
  } else {
    return createServiceAccount({ name, roles });
  }
}
