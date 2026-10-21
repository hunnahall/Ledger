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
        size="sm"
        onClick={() => open(<CreateRuleForm categories={categories} sources={sources} onDone={close} />)}
      >
        <AddIcon size={16} />
        Add rule
      </Button>
      {modal}
    </>
  );
}
