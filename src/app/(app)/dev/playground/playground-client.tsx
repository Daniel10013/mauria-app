"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  detectIntentAction,
  fetchRecentAction,
  fetchTeamAction,
  fetchUpcomingAction,
  guruReplyAction,
} from "./actions";

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function PlaygroundClient() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Playground (apenas dev)
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bancada para testar Football-Data, Gemini e detecção de intenção
          antes de plugar no chat real.
        </p>
      </header>
      <FootballSection />
      <GuruSection />
      <IntentSection />
    </main>
  );
}

function FootballSection() {
  const [teamId, setTeamId] = useState("65");
  const [output, setOutput] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function run(action: (id: number) => Promise<{ ok: boolean; data?: unknown; error?: string }>) {
    const id = Number(teamId);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error("Informe um ID numérico positivo.");
      return;
    }
    startTransition(async () => {
      const result = await action(id);
      if (!result.ok) {
        setOutput(`error: ${result.error ?? "unknown"}`);
        toast.error(result.error ?? "Erro");
        return;
      }
      setOutput(pretty(result.data));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1 · Football-Data</CardTitle>
        <CardDescription>
          Default = 65 (Manchester City). Segunda chamada idêntica vem do cache
          (verifique nos logs do servidor: cache hit).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="teamId">teamId</Label>
            <Input
              id="teamId"
              type="number"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => run(fetchTeamAction)}
            >
              Buscar time
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => run(fetchUpcomingAction)}
            >
              Próximos jogos
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => run(fetchRecentAction)}
            >
              Últimos jogos
            </Button>
          </div>
        </div>
        <pre className="max-h-80 overflow-auto rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
          {output || "—"}
        </pre>
      </CardContent>
    </Card>
  );
}

function GuruSection() {
  const [message, setMessage] = useState(
    "E aí, MaurIA, fala um pouco do meu time"
  );
  const [reply, setReply] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function onGenerate() {
    startTransition(async () => {
      const result = await guruReplyAction(message);
      if (!result.ok) {
        toast.error(result.error);
        setReply("");
        return;
      }
      setReply(result.data.text);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2 · Gemini · Resposta do guru</CardTitle>
        <CardDescription>
          Usa o seu perfil atual para montar o system prompt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="guru-msg">Mensagem do usuário</Label>
          <textarea
            id="guru-msg"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isPending}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Button type="button" onClick={onGenerate} disabled={isPending}>
          {isPending ? "Gerando..." : "Gerar resposta do guru"}
        </Button>
        {reply && (
          <div className="rounded-2xl border border-brand-accent/40 bg-brand-accent/5 px-4 py-3 text-sm leading-relaxed">
            {reply}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntentSection() {
  const [message, setMessage] = useState("Liverpool x City quem ganha?");
  const [output, setOutput] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function onDetect() {
    startTransition(async () => {
      const result = await detectIntentAction(message);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOutput(pretty(result.data));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3 · Detecção de intenção</CardTitle>
        <CardDescription>
          Heurística + LLM. Mensagens sem trigger nem chamam o Gemini.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="intent-msg">Mensagem do usuário</Label>
          <Input
            id="intent-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isPending}
          />
        </div>
        <Button type="button" onClick={onDetect} disabled={isPending}>
          {isPending ? "Detectando..." : "Detectar"}
        </Button>
        <pre className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
          {output || "—"}
        </pre>
      </CardContent>
    </Card>
  );
}
