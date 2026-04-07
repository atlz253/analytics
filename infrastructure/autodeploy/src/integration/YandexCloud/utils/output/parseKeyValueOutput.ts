export interface ParsedOutput {
  [key: string]: string | ParsedOutput;
}

export function parseKeyValueOutput(input: string): ParsedOutput {
  const result: ParsedOutput = {};
  const stack: Array<{ indent: number; obj: ParsedOutput }> = [
    { indent: -1, obj: result },
  ];

  for (const line of input.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.search(/\S/);
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    const rawValue = line.substring(colonIndex + 1).trim();

    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]!.obj;

    if (rawValue === "") {
      const newObj: ParsedOutput = {};
      parent[key] = newObj;
      stack.push({ indent, obj: newObj });
    } else {
      const value = rawValue.replace(/^["'](.*)["']$/, "$1");
      parent[key] = value;
    }
  }

  return result;
}
