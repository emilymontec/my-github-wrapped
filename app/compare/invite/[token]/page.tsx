import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { getComparisonInvitePreview } from "@/lib/comparisons/invites";
import { getRequestDictionary } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/dictionary";
import { PixelGridBackground } from "@/components/ui/PixelGridBackground";
import { InviteAcceptActions } from "@/components/comparisons/InviteAcceptActions";

/**
 * Página pública a propósito -- a diferencia de /compare (que redirige
 * si no hay sesión), acá SÍ hay que poder mostrar "fulano te invitó"
 * a un visitante sin loguear, para que decida si vale la pena iniciar
 * sesión con GitHub. La lectura del invite (`getComparisonInvitePreview`)
 * no expone nada sensible -- solo el username de quien invitó y el
 * estado, nunca el email invitado ni datos de actividad.
 */
export default async function ComparisonInvitePage({ params }: { params: { token: string } }) {
  const [session, invite, { dict }] = await Promise.all([auth(), getComparisonInvitePreview(params.token), getRequestDictionary()]);

  const copy = dict.comparisons.invitePage;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-cool-ink px-6">
      <PixelGridBackground variant="quiet" />
      <div className="relative z-10 w-full max-w-md">
        <div className="bento-panel p-8 text-center">
          {!invite ? (
            <p className="text-cool-muted">{copy.notFound}</p>
          ) : invite.status === "EXPIRED" ? (
            <p className="text-cool-muted">{copy.expired}</p>
          ) : invite.status === "DECLINED" ? (
            <p className="text-cool-muted">{copy.declined}</p>
          ) : invite.status === "ACCEPTED" ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-cool-muted">{copy.alreadyResolved}</p>
              <Link href="/compare" className="btn-flat-outline">
                {copy.viewComparisons}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <h1 className="font-display text-xl font-semibold text-cool-text">
                {t(copy.heading, { username: invite.inviterUsername })}
              </h1>
              <p className="text-sm text-cool-muted">{t(copy.description, { username: invite.inviterUsername })}</p>

              {!session?.user?.id ? (
                <form
                  action={async () => {
                    "use server";
                    await signIn("github", { redirectTo: `/compare/invite/${params.token}` });
                  }}
                >
                  <button type="submit" className="btn-cool">
                    {copy.signInToAccept}
                  </button>
                </form>
              ) : (
                <InviteAcceptActions token={params.token} copy={{ accept: copy.accept, decline: copy.decline }} />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
