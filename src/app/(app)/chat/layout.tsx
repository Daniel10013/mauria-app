import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import { ThreadSidebar } from "@/components/chat/thread-sidebar";
import { SidebarDrawer } from "@/components/chat/sidebar-drawer";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      <aside className="hidden w-72 border-r border-border/60 md:flex">
        <ThreadSidebar userId={profile.id} />
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2 md:hidden">
          <SidebarDrawer>
            <ThreadSidebar userId={profile.id} />
          </SidebarDrawer>
          <span className="text-sm font-medium">Conversas</span>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
