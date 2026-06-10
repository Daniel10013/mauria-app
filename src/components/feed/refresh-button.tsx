"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshFeedAction } from "@/app/(app)/feed-actions";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await refreshFeedAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      toast.success("Feed atualizado.");
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onClick}
      disabled={pending}
      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <RotateCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
      Atualizar
    </Button>
  );
}
