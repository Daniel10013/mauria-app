"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ComposerProps {
  isStreaming: boolean;
  onSend: (message: string) => void | Promise<void>;
  initialValue?: string;
  autoFocus?: boolean;
  className?: string;
}

export function Composer({
  isStreaming,
  onSend,
  initialValue = "",
  autoFocus = false,
  className,
}: ComposerProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 5 * 24;
    el.style.height = `${Math.min(el.scrollHeight, max + 16)}px`;
  }

  useEffect(() => {
    autoResize();
  }, [value]);

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    setValue("");
    await onSend(trimmed);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  const disabled = isStreaming || value.trim().length === 0;

  return (
    <form
      className={cn(
        "flex items-end gap-2 rounded-2xl border border-border/60 bg-card/80 p-2 shadow-sm backdrop-blur",
        className
      )}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="Pergunta o que quiser de futebol, irmão..."
        className="min-h-[40px] resize-none border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={isStreaming}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled}
        aria-label="Enviar"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
