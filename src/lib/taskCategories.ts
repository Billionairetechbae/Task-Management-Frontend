export function canonicalTaskCategories(values: Array<string | null | undefined>): string[] {
  const canonical = new Map<string, string>();
  values.forEach((raw) => {
    const value = (raw ?? "").trim();
    const key = value.toLocaleLowerCase();
    if (value && !canonical.has(key)) canonical.set(key, value);
  });
  return [...canonical.values()].sort((a, b) => a.localeCompare(b));
}

export function matchTaskCategory(value: string, suggestions: string[]): string | null {
  const key = value.trim().toLocaleLowerCase();
  return key ? suggestions.find((suggestion) => suggestion.toLocaleLowerCase() === key) ?? null : null;
}
