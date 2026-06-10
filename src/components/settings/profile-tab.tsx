"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateProfileAction } from "@/app/(app)/settings/actions";

interface ProfileTabProps {
  initial: {
    displayName: string;
    email: string;
    style: "casual" | "analytical" | "balanced";
  };
}

const STYLE_OPTIONS: ReadonlyArray<{
  value: "casual" | "analytical" | "balanced";
  label: string;
  hint: string;
}> = [
  {
    value: "casual",
    label: "Casual",
    hint: "Tom leve, brincadeiras de quem assiste no boteco.",
  },
  {
    value: "analytical",
    label: "Analítico",
    hint: "Foco em números e leitura tática profunda.",
  },
  {
    value: "balanced",
    label: "Equilibrado",
    hint: "Mistura de papo + dado, padrão recomendado.",
  },
];

export function ProfileTab({ initial }: ProfileTabProps) {
  const router = useRouter();
  const [name, setName] = React.useState(initial.displayName);
  const [style, setStyle] = React.useState(initial.style);
  const [savingName, startSaveName] = React.useTransition();
  const [savingStyle, startSaveStyle] = React.useTransition();

  const nameDirty = name.trim() !== initial.displayName.trim();
  const trimmedName = name.trim();

  function onSaveName() {
    if (!nameDirty || trimmedName.length === 0) return;
    startSaveName(async () => {
      const result = await updateProfileAction({ displayName: trimmedName });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Nome atualizado.");
      router.refresh();
    });
  }

  function onChangeStyle(value: string) {
    if (value === style) return;
    const newStyle = value as ProfileTabProps["initial"]["style"];
    setStyle(newStyle);
    startSaveStyle(async () => {
      const result = await updateProfileAction({ style: newStyle });
      if (!result.ok) {
        setStyle(initial.style);
        toast.error(result.error);
        return;
      }
      toast.success("Estilo atualizado.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="display-name">Nome de exibição</Label>
        <div className="flex gap-2">
          <Input
            id="display-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Como devo te chamar?"
            maxLength={50}
            disabled={savingName}
          />
          <Button
            type="button"
            onClick={onSaveName}
            disabled={!nameDirty || savingName || trimmedName.length === 0}
          >
            {savingName ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Aparece nas saudações da home e no chat.
        </p>
      </div>

      <div className="space-y-2">
        <Label>E-mail</Label>
        <Input value={initial.email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Trocar e-mail ainda não é suportado por aqui.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Estilo da conversa</Label>
          <p className="text-xs text-muted-foreground">
            Como o MaurIA se dirige a você nas respostas.
          </p>
        </div>
        <RadioGroup
          value={style}
          onValueChange={onChangeStyle}
          disabled={savingStyle}
          className="gap-2"
        >
          {STYLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              htmlFor={`style-${option.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-brand-accent/60"
            >
              <RadioGroupItem
                id={`style-${option.value}`}
                value={option.value}
                className="mt-1"
              />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {option.hint}
                </div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
