"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatRelativeBR } from "@/lib/chat/time-ago";
import {
  deleteThreadAction,
  renameThreadAction,
} from "@/app/(app)/chat/actions";

interface ThreadItemProps {
  threadId: string;
  title: string;
  updatedAt: Date;
}

export function ThreadItem({ threadId, title, updatedAt }: ThreadItemProps) {
  const router = useRouter();
  // O ativo é derivado do pathname no cliente: em navegação client-side o
  // layout do servidor não re-renderiza, então uma prop vinda de lá fica stale.
  const pathname = usePathname();
  const active = pathname === `/chat/${threadId}`;
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const [isPending, startTransition] = useTransition();

  function onRenameSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameThreadAction(threadId, renameValue);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRenameOpen(false);
      router.refresh();
    });
  }

  function onConfirmDelete() {
    startTransition(async () => {
      const result = await deleteThreadAction(threadId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDeleteOpen(false);
      if (active) router.push("/chat");
      else router.refresh();
    });
  }

  return (
    <>
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-md px-2 py-2 transition",
          active ? "bg-accent" : "hover:bg-accent/60"
        )}
      >
        <Link href={`/chat/${threadId}`} className="flex flex-1 flex-col gap-0.5">
          <span className="line-clamp-1 text-sm font-medium">{title}</span>
          <span className="text-[11px] text-muted-foreground">
            {formatRelativeBR(updatedAt)}
          </span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ações da conversa"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setRenameValue(title);
                setRenameOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setDeleteOpen(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear conversa</DialogTitle>
            <DialogDescription>
              Dê um nome curto para encontrar fácil depois.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onRenameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`rename-${threadId}`}>Título</Label>
              <Input
                id={`rename-${threadId}`}
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={80}
                disabled={isPending}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRenameOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Todas as mensagens serão apagadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                onConfirmDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
