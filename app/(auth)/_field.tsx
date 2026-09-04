// Shared input styling for the auth forms — identical markup was repeated
// across login and signup before the reset pages doubled it again.
export function AuthField({
  label,
  name,
  type = "text",
  autoComplete,
  minLength,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        name={name}
        required
        autoComplete={autoComplete}
        minLength={minLength}
        defaultValue={defaultValue}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

export function AuthMessages({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      {notice && <p className="text-sm text-positive">{notice}</p>}
      {error && <p className="text-sm text-negative">{error}</p>}
    </>
  );
}
