"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Composer } from "@/components/chat/composer";
import { createThreadAction } from "./actions";

interface ChatWelcomeProps {
  suggestions: string[];
}

export function ChatWelcome({ suggestions }: ChatWelcomeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function startWith(message: string) {
    startTransition(async () => {
      const result = await createThreadAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const params = new URLSearchParams({ q: message });
      router.push(`/chat/${result.data.threadId}?${params.toString()}`);
    });
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="outline"
            onClick={() => startWith(suggestion)}
            disabled={isPending}
            className="h-auto justify-start whitespace-normal py-3 text-left"
          >
            <Sparkles className="mr-2 h-4 w-4 shrink-0 text-brand-accent" />
            <span className="text-sm">{suggestion}</span>
          </Button>
        ))}
      </div>
      <div className="w-full">
        <Composer
          isStreaming={isPending}
          onSend={(message) => startWith(message)}
          autoFocus
        />
      </div>
    </div>
  );
}
