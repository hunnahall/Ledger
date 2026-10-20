"use client";

import { useModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";
import { CreateRuleForm } from "@/components/rules/create-rule-form";

type Option = { id: string; name: string };

export function AddRuleButton({
  categories,
  sources,
}: {
  categories: Option[];
  sources: Option[];
}) {
  const { open, close, modal } = useModal();

  return (
    <>
      <Button
        type="button"
        variant="accent"
        size="icon"
        aria-label="Add rule"
        onClick={() => open(<CreateRuleForm categories={categories} sources={sources} onDone={close} />)}
      >
        <AddIcon />
      </Button>
      {modal}
    </>
  );
}
