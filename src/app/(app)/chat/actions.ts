"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";
import { getCurrentProfile } from "@/lib/auth/profile";
import { generateThreadTitle } from "@/lib/chat/title";

async function requireUserId(): Promise<string | null> {
  const profile = await getCurrentProfile();
  return profile?.id ?? null;
}

async function ensureThreadOwnership(
  threadId: string,
  userId: string
): Promise<Result<true>> {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { id: true, userId: true },
  });
  if (!thread) return err("Conversa não encontrada.");
  if (thread.userId !== userId) return err("Acesso negado.");
  return ok(true);
}

export async function createThreadAction(): Promise<Result<{ threadId: string }>> {
  const userId = await requireUserId();
  if (!userId) return err("Sessão expirada. Faça login novamente.");

  const thread = await prisma.chatThread.create({
    data: { userId },
    select: { id: true },
  });
  revalidatePath("/chat");
  return ok({ threadId: thread.id });
}

const renameSchema = z.object({
  threadId: z.string().uuid("ID inválido."),
  title: z.string().min(1, "Título não pode ficar vazio.").max(80),
});

export async function renameThreadAction(
  threadId: string,
  title: string
): Promise<Result<void>> {
  const userId = await requireUserId();
  if (!userId) return err("Sessão expirada. Faça login novamente.");
  const parsed = renameSchema.safeParse({ threadId, title });
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const guard = await ensureThreadOwnership(parsed.data.threadId, userId);
  if (!guard.ok) return guard;

  await prisma.chatThread.update({
    where: { id: parsed.data.threadId },
    data: { title: parsed.data.title.trim() },
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${parsed.data.threadId}`);
  return ok(undefined);
}

export async function deleteThreadAction(
  threadId: string
): Promise<Result<void>> {
  const userId = await requireUserId();
  if (!userId) return err("Sessão expirada. Faça login novamente.");
  const guard = await ensureThreadOwnership(threadId, userId);
  if (!guard.ok) return guard;

  await prisma.chatThread.delete({ where: { id: threadId } });
  revalidatePath("/chat");
  return ok(undefined);
}

/**
 * Wrapper de Server Action para o gerador de título. O Route Handler chama
 * o helper puro (`generateThreadTitle`) diretamente — esta action existe
 * apenas para a UI re-disparar manualmente se necessário.
 */
export async function generateThreadTitleAction(
  threadId: string
): Promise<Result<{ title: string | null }>> {
  const userId = await requireUserId();
  if (!userId) return err("Sessão expirada. Faça login novamente.");
  const guard = await ensureThreadOwnership(threadId, userId);
  if (!guard.ok) return guard;

  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  if (messages.length < 2) return ok({ title: null });
  const userMessage = messages.find((m) => m.role === "user")?.content;
  const assistantReply = messages.find((m) => m.role === "assistant")?.content;
  if (!userMessage || !assistantReply) return ok({ title: null });

  try {
    const title = await generateThreadTitle({ userMessage, assistantReply });
    if (title) {
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { title },
      });
      revalidatePath("/chat");
      revalidatePath(`/chat/${threadId}`);
    }
    return ok({ title });
  } catch (error) {
    logger.warn("generateThreadTitleAction failed", { error: String(error) });
    return ok({ title: null });
  }
}
