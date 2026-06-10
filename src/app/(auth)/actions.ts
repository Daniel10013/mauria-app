"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";

const credentialsSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "Senha precisa ter no mínimo 8 caracteres."),
});

const signUpSchema = credentialsSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"],
});

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function translateAuthError(message: string | undefined): string {
  if (!message) return "Não consegui completar a operação. Tenta de novo.";
  const m = message.toLowerCase();
  if (m.includes("user already registered") || m.includes("already")) {
    return "Esse e-mail já está cadastrado.";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (m.includes("weak password")) {
    return "Senha muito fraca. Use ao menos 8 caracteres com letras e números.";
  }
  return "Não consegui completar a operação. Tenta de novo em uns minutinhos.";
}

export async function signUpAction(formData: FormData): Promise<Result<void>> {
  const parsed = signUpSchema.safeParse({
    email: readField(formData, "email"),
    password: readField(formData, "password"),
    confirmPassword: readField(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    logger.warn("signUpAction failed", { code: error.status });
    return err(translateAuthError(error.message));
  }
  return ok(undefined);
}

export async function signInAction(
  formData: FormData
): Promise<Result<{ needsOnboarding: boolean }>> {
  const parsed = credentialsSchema.safeParse({
    email: readField(formData, "email"),
    password: readField(formData, "password"),
  });
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user || !data.user.email) {
    logger.warn("signInAction failed", { code: error?.status });
    return err(translateAuthError(error?.message));
  }

  const profile = await prisma.profile.upsert({
    where: { id: data.user.id },
    create: {
      id: data.user.id,
      email: data.user.email,
    },
    update: {},
  });

  const needsOnboarding =
    profile.onboardingCompletedAt === null ||
    profile.favoriteTeamId === null ||
    profile.followedLeagues.length === 0;

  return ok({ needsOnboarding });
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
