import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function addServiceAccountCatalogRole({
  role,
  catalogID,
  serviceAccountID,
}: {
  role: string;
  catalogID: string;
  serviceAccountID: string;
}) {
  await execa`${YC_PATH} resource-manager folder add-access-binding ${catalogID} --role ${role} --subject serviceAccount:${serviceAccountID}`;
}
