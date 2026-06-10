import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/profile";
import { MessageList } from "@/components/chat/message-list";
import { ChatRealtime } from "@/components/chat/chat-realtime";
import { ThreadHeader } from "./thread-header";

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function ThreadPage({
  params,
  searchParams,
}: ThreadPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { threadId } = await params;
  const { q } = await searchParams;

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { id: true, userId: true, title: true, updatedAt: true },
  });
  if (!thread || thread.userId !== profile.id) {
    notFound();
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-3 px-4 py-4">
      <ThreadHeader
        threadId={thread.id}
        title={thread.title}
        updatedAt={thread.updatedAt}
      />
      <div className="flex-1">
        <MessageList threadId={thread.id} />
      </div>
      <div className="pt-2">
        <ChatRealtime threadId={thread.id} initialPrompt={q ?? null} />
      </div>
    </div>
  );
}
