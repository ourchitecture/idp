export type CodeownersEntry = {
  pattern: string;
  owners: string[];
};

export function parseCodeowners(content: string): CodeownersEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: CodeownersEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }

    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      continue;
    }

    const [pattern, ...owners] = parts;
    entries.push({ pattern, owners });
  }

  return entries;
}
