const SERVICE_ACCOUNT_PREFIX = "autodeploy";

export const serviceAccounts = {
  catalogEditor: `${SERVICE_ACCOUNT_PREFIX}-catalog-editor`,
  dockerImagePuller: `${SERVICE_ACCOUNT_PREFIX}-image-puller`,
  storageEditor: `${SERVICE_ACCOUNT_PREFIX}-storage-editor`,
} as const;
