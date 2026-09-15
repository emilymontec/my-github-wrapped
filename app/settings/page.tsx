import { redirect } from "next/navigation";
import { auth, signIn, GITHUB_SCOPES_WITH_PRIVATE_REPOS } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getPrivateReposStatus } from "@/lib/settings/service";
import { getNotificationPreferences } from "@/lib/notifications/preferences";
import { getRequestDictionary } from "@/lib/i18n/server";
import { PrivateReposToggle } from "@/components/settings/PrivateReposToggle";
import { NotificationPreferencesToggles } from "@/components/settings/NotificationPreferencesToggles";
import { LanguageToggle } from "@/components/settings/LanguageToggle";
import { DataExportPanel } from "@/components/settings/DataExportPanel";
import { AccountDangerZone } from "@/components/settings/AccountDangerZone";
import { PixelGridBackground } from "@/components/ui/PixelGridBackground";

/**
 * ⚠️ Fase 6 — el punto de mayor sensibilidad de privacidad del producto
 * (sección 42, Consideraciones): "cualquier ambigüedad en la UI sobre
 * qué se está compartiendo es inaceptable". El copy de esta página se
 * revisó explícitamente para ser inequívoco — decir qué se lee (nombres
 * de repos privados, sus commits, sus lenguajes) y qué NO se hace con
 * eso (nunca se comparte el contenido del código, solo metadata
 * agregada, y nunca se hace público sin un paso de consentimiento
 * aparte — ver Fase 4).
 */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const status = await getPrivateReposStatus(session.user.id);
  const notificationPreferences = await getNotificationPreferences(session.user.id);
  const { locale, dict } = await getRequestDictionary();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { username: true }
  });

  return (
    <main className="relative mx-auto max-w-2xl px-6 py-12">
      <PixelGridBackground variant="quiet" />
      <div className="relative z-10">
      <h1 className="mb-8 font-display text-2xl font-semibold text-white">{dict.settings.pageTitle}</h1>

      <section className="mb-6 rounded-xl border border-wrapped-border bg-wrapped-card p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          {dict.settings.languageSectionTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          {dict.settings.languageSectionDescription}
        </p>
        <div className="mt-6">
          <LanguageToggle
            currentLocale={locale}
            spanishLabel={dict.settings.languageSpanish}
            englishLabel={dict.settings.languageEnglish}
          />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-wrapped-border bg-wrapped-card p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          {dict.settings.notificationsSectionTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          {dict.settings.notificationsSectionDescription}
        </p>
        <div className="mt-6">
          <NotificationPreferencesToggles
            initialWrappedReadyEmail={notificationPreferences.wrappedReadyEmail}
            initialStreakMilestoneEmail={notificationPreferences.streakMilestoneEmail}
            locale={locale}
          />
        </div>
      </section>

      <section className="rounded-xl border border-wrapped-border bg-wrapped-card p-6">
        <h2 className="font-display text-lg font-semibold text-white">{dict.settings.privateRepos.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          {dict.settings.privateRepos.intro} <strong>{dict.settings.privateRepos.introBold}</strong>{" "}
          {dict.settings.privateRepos.introRest}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          {dict.settings.privateRepos.note} <strong>{dict.settings.privateRepos.noteBold}</strong>{" "}
          {dict.settings.privateRepos.noteRest}{" "}
          <span className="text-neutral-300">{dict.settings.privateRepos.noteShareLink}</span>{" "}
          {dict.settings.privateRepos.noteEnd}
        </p>

        <div className="mt-6">
          {!status.hasGrantedScope ? (
            <form
              action={async () => {
                "use server";
                await signIn(
                  "github",
                  { redirectTo: "/settings" },
                  { scope: GITHUB_SCOPES_WITH_PRIVATE_REPOS }
                );
              }}
            >
              <button
                type="submit"
                className="rounded-full bg-wrapped-accent px-5 py-2.5 text-sm font-medium text-black hover:opacity-90"
              >
                {dict.settings.privateRepos.connectButton}
              </button>
            </form>
          ) : (
            <PrivateReposToggle initialEnabled={status.enabled} enabledAt={status.enabledAt} locale={locale} />
          )}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-wrapped-border bg-wrapped-card p-6">
        <h2 className="font-display text-lg font-semibold text-white">{dict.settings.dataExport.title}</h2>
        <div className="mt-4">
          <DataExportPanel locale={locale} />
        </div>
      </section>

      <section className="rounded-xl border border-red-500/20 bg-wrapped-card p-6">
        <h2 className="font-display text-lg font-semibold text-red-400">{dict.settings.deleteAccount.title}</h2>
        <div className="mt-4">
          <AccountDangerZone username={user.username ?? ""} locale={locale} />
        </div>
      </section>
    </div>
    </main>
  );
}
