import { prisma } from "@/lib/prisma";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NewThreadButton } from "./new-thread-button";
import { ThreadItem } from "./thread-item";

interface ThreadSidebarProps {
  userId: string;
  activeThreadId?: string;
}

export async function ThreadSidebar({
  userId,
  activeThreadId,
}: ThreadSidebarProps) {
  const threads = await prisma.chatThread.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <NewThreadButton />
      <ScrollArea className="-mx-2 flex-1">
        {threads.length === 0 ? (
          <p className="px-2 py-6 text-xs leading-relaxed text-muted-foreground">
            Sua primeira conversa fica aqui. Manda a primeira pergunta lá no
            campo abaixo, irmão.
          </p>
        ) : (
          <div className="flex flex-col gap-1 px-2">
            {threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                threadId={thread.id}
                title={thread.title}
                updatedAt={thread.updatedAt}
                active={thread.id === activeThreadId}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
