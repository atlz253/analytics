export async function deleteImage({
  imageId,
  iamToken,
}: {
  imageId: string;
  iamToken: string;
}) {
  await fetch(
    `https://container-registry.api.cloud.yandex.net/container-registry/v1/images/${imageId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${iamToken}`,
      },
    },
  );
}
