// Shared input styling for the auth forms — identical markup was repeated
// across login and signup before the reset pages doubled it again.
import { Input } from "@/components/ui/input";

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
      <Input
        type={type}
        name={name}
        required
        autoComplete={autoComplete}
        minLength={minLength}
        defaultValue={defaultValue}
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
