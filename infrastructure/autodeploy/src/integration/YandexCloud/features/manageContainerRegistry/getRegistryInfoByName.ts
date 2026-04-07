export type RegistryInfo = {
  id: string;
  folderId: string;
  name: string;
  status: string;
  createdAt: string;
};

type RegistryListResponse = {
  registries: RegistryInfo[];
};

export async function getRegistryInfoByName({
  catalogId,
  name,
  iamToken,
}: {
  catalogId: string;
  name: string;
  iamToken: string;
}) {
  const params = new URLSearchParams({
    folderId: catalogId,
    filter: `name="${name}"`,
  });
  const response = await fetch(
    `https://container-registry.api.cloud.yandex.net/container-registry/v1/registries?${params}`,
    {
      headers: {
        Authorization: `Bearer ${iamToken}`,
      },
    },
  );
  const data = (await response.json()) as RegistryListResponse;
  return data.registries?.[0];
}
