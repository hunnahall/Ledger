export type BucketOption = { type: "source"; id: string } | { type: "fund"; id: string };

export function encodeBucketOption(option: BucketOption | null): string {
  if (!option) return "";
  return `${option.type}:${option.id}`;
}

export function decodeBucketOption(value: FormDataEntryValue | null): BucketOption | null {
  const [type, id] = String(value ?? "").split(":");
  if (type === "source" && id) return { type: "source", id };
  if (type === "fund" && id) return { type: "fund", id };
  return null;
}
