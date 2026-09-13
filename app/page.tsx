import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRequestDictionary } from "@/lib/i18n/server";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const { dict } = await getRequestDictionary();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">{dict.landing.title}</h1>
        <p className="text-lg text-neutral-400">{dict.landing.subtitle}</p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("github");
        }}
      >
        <button
          type="submit"
          className="rounded-full bg-wrapped-accent px-6 py-3 font-medium text-black transition hover:opacity-90"
        >
          {dict.landing.connectButton}
        </button>
      </form>

      <p className="max-w-md text-sm text-neutral-500">{dict.landing.privacyNote}</p>
    </main>
  );
}
