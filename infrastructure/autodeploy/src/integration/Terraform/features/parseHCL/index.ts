export function parseHCL(
  input: string,
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  const lines = input.split("\n");
  let currentBlock: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const blockMatch = trimmed.match(/^([\w-]+)\s*=\s*\{$/);
    if (blockMatch) {
      currentBlock = blockMatch[1];
      result[currentBlock] = {};
      continue;
    }

    if (trimmed === "}") {
      currentBlock = null;
      continue;
    }

    if (currentBlock) {
      const pairMatch = trimmed.match(/^"([\w_]+)"\s*=\s*"([^"]*)"$/);
      if (pairMatch) {
        result[currentBlock][pairMatch[1]] = pairMatch[2];
      }
    }
  }

  return result;
}
