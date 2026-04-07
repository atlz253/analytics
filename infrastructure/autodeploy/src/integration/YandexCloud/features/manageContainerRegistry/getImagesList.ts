export type ImageInfo = {
  tags: string[];
  id: string;
  name: string;
  digest: string;
  compressedSize: string;
  createdAt: string;
};

export type ImagesListResponse = {
  images?: ImageInfo[];
};

export async function getImagesList({
  iamToken,
  registryId,
}: {
  iamToken: string;
  registryId: string;
}) {
  const params = new URLSearchParams({ registryId });
  const response = await fetch(
    `https://container-registry.api.cloud.yandex.net/container-registry/v1/images?${params}`,
    {
      headers: {
        Authorization: `Bearer ${iamToken}`,
      },
    },
  );
  const result = await response.json();
  return result as ImagesListResponse;
}
