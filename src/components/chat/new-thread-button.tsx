"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createThreadAction } from "@/app/(app)/chat/actions";

export function NewThreadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await createThreadAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/chat/${result.data.threadId}`);
    });
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="w-full justify-start"
    >
      <Plus className="mr-2 h-4 w-4" />
      {isPending ? "Criando..." : "Nova conversa"}
    </Button>
  );
}
