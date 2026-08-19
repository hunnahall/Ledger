"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="flex flex-col items-start gap-3">
      <p className="font-medium text-negative">Something went wrong</p>
      <p className="text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      <Button type="button" variant="secondary" onClick={reset}>
        Try again
      </Button>
    </Card>
  );
}
