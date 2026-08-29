"use client";

import { useModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";
import { CreateVendorRuleForm } from "@/components/settings/create-vendor-rule-form";

export function AddVendorRuleButton({ categories }: { categories: { id: string; name: string }[] }) {
  const { open, close, modal } = useModal();

  return (
    <>
      <Button
        type="button"
        variant="accent"
        size="icon"
        aria-label="Add rule"
        onClick={() => open(<CreateVendorRuleForm categories={categories} onDone={close} />)}
      >
        <AddIcon />
      </Button>
      {modal}
    </>
  );
}
