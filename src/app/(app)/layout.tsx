import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";
import { getCurrentProfile, isOnboardingComplete } from "@/lib/auth/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  if (!isOnboardingComplete(profile) && !isOnboardingRoute) {
    redirect("/onboarding/time");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar profile={profile} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
