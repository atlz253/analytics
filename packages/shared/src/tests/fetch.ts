export async function post(
  input: string | URL | globalThis.Request,
  init?: RequestInit
) {
  const response = await fetch(input, {
    ...init,
    method: "POST",
    headers: {
      ...init?.headers,
      "Content-Type": "application/json;charset=utf-8",
    },
  });
  return response.json();
}

