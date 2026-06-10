"use server";

import { z } from "zod";
import { err, ok, type Result } from "@/lib/result";
import {
  getTeam,
  getTeamRecentMatches,
  getTeamUpcomingMatches,
} from "@/lib/football/client";
import { generateGuruReply } from "@/lib/llm/gemini";
import { detectIntent, type Intent } from "@/lib/llm/intent";
import { buildGuruSystemPrompt } from "@/lib/llm/prompts";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getTeamById } from "@/lib/data/teams";

const teamIdSchema = z.object({
  teamId: z.number().int().positive(),
});

function ensureDev(): Result<true> {
  if (process.env.NODE_ENV === "production") {
    return err("not_available");
  }
  return ok(true);
}

export async function fetchTeamAction(
  teamId: number
): Promise<Result<unknown>> {
  const guard = ensureDev();
  if (!guard.ok) return guard;
  const parsed = teamIdSchema.safeParse({ teamId });
  if (!parsed.success) return err("ID inválido.");
  return getTeam(parsed.data.teamId);
}

export async function fetchUpcomingAction(
  teamId: number
): Promise<Result<unknown>> {
  const guard = ensureDev();
  if (!guard.ok) return guard;
  const parsed = teamIdSchema.safeParse({ teamId });
  if (!parsed.success) return err("ID inválido.");
  return getTeamUpcomingMatches(parsed.data.teamId);
}

export async function fetchRecentAction(
  teamId: number
): Promise<Result<unknown>> {
  const guard = ensureDev();
  if (!guard.ok) return guard;
  const parsed = teamIdSchema.safeParse({ teamId });
  if (!parsed.success) return err("ID inválido.");
  return getTeamRecentMatches(parsed.data.teamId);
}

const guruSchema = z.object({
  message: z.string().min(1, "Mensagem vazia."),
});

export async function guruReplyAction(
  message: string
): Promise<Result<{ text: string }>> {
  const guard = ensureDev();
  if (!guard.ok) return guard;
  const parsed = guruSchema.safeParse({ message });
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Mensagem inválida.");
  }

  const profile = await getCurrentProfile();
  if (!profile) return err("Sem sessão.");
  const team = profile.favoriteTeamId
    ? getTeamById(profile.favoriteTeamId)
    : null;

  const systemPrompt = buildGuruSystemPrompt({
    displayName: profile.displayName,
    favoriteTeam: team ? { id: team.id, name: team.name } : null,
    followedLeagues: profile.followedLeagues,
    style: profile.style,
  });

  return generateGuruReply({
    systemPrompt,
    history: [],
    userMessage: parsed.data.message,
  });
}

export async function detectIntentAction(
  message: string
): Promise<Result<Intent>> {
  const guard = ensureDev();
  if (!guard.ok) return guard;
  const parsed = guruSchema.safeParse({ message });
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Mensagem inválida.");
  }
  const intent = await detectIntent(parsed.data.message);
  return ok(intent);
}
