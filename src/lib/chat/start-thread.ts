"use server";

import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { getCurrentProfile } from "@/lib/auth/profile";

/**
 * Cria uma thread vazia para o usuário atual. O cliente recebe o `threadId`
 * e redireciona para `/chat/{id}?q={mensagem}` — a thread page (e o
 * `ChatRealtime` dentro dela) detectam a query string e disparam o stream
 * automaticamente. Isso evita ter que fazer fetch para `/api/chat` direto
 * de Server Action (cookies/sessão ficam mais simples desse jeito).
 */
export async function createThreadAndAsk(
  message: string
): Promise<Result<{ threadId: string; redirectTo: string }>> {
  const trimmed = message.trim();
  if (!trimmed) return err("Mensagem vazia.");
  if (trimmed.length > 2000) return err("Mensagem grande demais.");

  const profile = await getCurrentProfile();
  if (!profile) return err("Sessão expirada. Faça login novamente.");

  const thread = await prisma.chatThread.create({
    data: { userId: profile.id },
    select: { id: true },
  });

  return ok({
    threadId: thread.id,
    redirectTo: `/chat/${thread.id}?q=${encodeURIComponent(trimmed)}`,
  });
}
