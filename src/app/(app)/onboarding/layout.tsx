import { headers } from "next/headers";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const step = pathname.endsWith("/ligas") ? 2 : 1;

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-12">
      <div className="mb-8 space-y-3">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-accent">
          Passo {step} de 2
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          {step === 1 ? "Quem é o seu time do coração?" : "Quais ligas você acompanha?"}
        </h1>
        <p className="text-muted-foreground">
          {step === 1
            ? "Vamos personalizar tudo a partir daqui."
            : "Escolha quantas quiser. Dá pra ajustar depois."}
        </p>
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={step}
        >
          <div
            className="h-full bg-brand-accent transition-all"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>
      {children}
    </main>
  );
}
