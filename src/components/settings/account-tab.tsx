"use client";

import * as React from "react";
import { LogOut, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";
import { resetOnboardingAction } from "@/app/(app)/settings/actions";

export function AccountTab() {
  const [resetting, startReset] = React.useTransition();
  const [signingOut, startSignOut] = React.useTransition();

  function onReset() {
    startReset(async () => {
      const result = await resetOnboardingAction();
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  function onSignOut() {
    startSignOut(async () => {
      await signOutAction();
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Refazer onboarding</h3>
          <p className="text-xs text-muted-foreground">
            Reseta time, ligas e radar. Você passa de novo pelos dois passos
            iniciais.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={resetting}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Refazer onboarding
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Refazer onboarding?</AlertDialogTitle>
              <AlertDialogDescription>
                Suas preferências atuais (time, ligas, radar) vão ser apagadas e
                você cai na tela de escolher time de novo. Suas conversas
                continuam salvas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onReset} disabled={resetting}>
                {resetting ? "Resetando..." : "Refazer agora"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Sair</h3>
          <p className="text-xs text-muted-foreground">
            Encerra a sessão neste dispositivo.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onSignOut}
          disabled={signingOut}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {signingOut ? "Saindo..." : "Sair"}
        </Button>
      </section>

      <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-destructive">
            Deletar conta
          </h3>
          <p className="text-xs text-muted-foreground">
            Apaga tudo: profile, conversas, preferências.
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          disabled
          title="Disponível em breve"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Deletar conta
        </Button>
        <p className="text-xs text-muted-foreground">
          Disponível em breve.
        </p>
      </section>
    </div>
  );
}
