import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, authClient, signIn, signOut } from "./client";
import { hasGateSessionMarker } from "./gate-session-marker";
import { resolveSignInGateState } from "./sign-in-gate";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

/**
 * Auth state components — plain wrappers around `useCurrentUserState()`.
 *
 * With auth on, visitors are signed out until they authenticate — in the sandbox
 * live preview too, which does real sign-in. The shared dev user appears only
 * when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
 * While the session is still resolving, gates that care about signed-out state
 * render nothing so there's no signed-out flash on hard reload.
 */

/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present (real session, or the disabled-auth dev user). */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/**
 * Render children only once we KNOW the visitor is signed out (`isPending` has
 * cleared and there is no user). Hidden while the session is still loading.
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/**
 * Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
 * `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
 * session loading, which feels like a second "Loading…" on /login.
 *
 * Guard routes by waiting out `isPending` first (see `use-current-user`), then
 * render this.
 */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

export function SignInGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, isPending } = useCurrentUserState();
  const state = resolveSignInGateState({ isPending, hasUser: user !== null });
  if (state === "pending") return null;
  if (state === "signed_in") return <>{children}</>;
  return <>{fallback ?? <SignInButtons />}</>;
}

export function SignInButtons() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      {GROK_PROVIDERS.map((p) => (
        <button
          key={p.providerId}
          type="button"
          onClick={() => signIn(p.providerId, { callbackURL: "/" })}
          className="w-full cursor-pointer rounded-md border border-neutral-300 px-4 py-2 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Continue with {p.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Minimal signed-in identity chip + sign-out. Restyle freely (see the
 * `design-ui` skill). Sign-out is only shown when auth is enabled (the
 * disabled-auth dev user has nothing to sign out of) and the session is not
 * gate-materialized — behind the gate the next request signs the viewer
 * straight back in, so a sign-out control there is a broken loop.
 */
export function AccountButton({ language = "en" }: { language?: "en" | "pt" }) {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!authEnabled || isPending || user) return null;

  const isPortuguese = language === "pt";
  const copy = isPortuguese
    ? {
        account: "Criar conta / Entrar",
        signIn: "Entrar",
        signUp: "Criar conta",
        name: "Nome",
        email: "Email",
        password: "Senha",
        google: "Continuar com Google",
        submitSignIn: "Entrar com email",
        submitSignUp: "Criar conta com email",
        switchSignIn: "Já tenho uma conta",
        switchSignUp: "Ainda não tenho uma conta",
        close: "Fechar",
        genericError: "Não foi possível concluir. Verifique os dados e tente novamente.",
      }
    : {
        account: "Create account / Sign in",
        signIn: "Sign in",
        signUp: "Create account",
        name: "Name",
        email: "Email",
        password: "Password",
        google: "Continue with Google",
        submitSignIn: "Sign in with email",
        submitSignUp: "Create account with email",
        switchSignIn: "I already have an account",
        switchSignUp: "I do not have an account yet",
        close: "Close",
        genericError: "Could not complete the request. Check your details and try again.",
      };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = mode === "signup"
      ? await authClient.signUp.email({ email, password, name: name.trim() || "User" })
      : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (result.error) {
      setError(copy.genericError);
      return;
    }
    setOpen(false);
    setEmail("");
    setPassword("");
    setName("");
  }

  return (
    <>
      <button type="button" className="btn-quiet px-3 py-1.5 text-xs sm:text-sm" onClick={() => setOpen(true)}>
        {copy.account}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" className="w-full max-w-md rounded-2xl border border-line bg-paper p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="account-dialog-title" className="font-display text-xl font-semibold text-ink">{mode === "signup" ? copy.signUp : copy.signIn}</h2>
                <p className="mt-1 text-xs text-muted">{copy.account}</p>
              </div>
              <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setOpen(false)} aria-label={copy.close}>×</button>
            </div>
            <button type="button" className="mt-5 w-full rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-paper-2" onClick={() => void signIn("grok-google", { callbackURL: "/" })}>
              {copy.google}
            </button>
            <div className="my-4 flex items-center gap-3 text-[11px] text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
            <form className="space-y-3" onSubmit={(event) => void submit(event)}>
              {mode === "signup" ? <label className="block text-xs font-medium text-ink-soft">{copy.name}<input required={false} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-pine" /></label> : null}
              <label className="block text-xs font-medium text-ink-soft">{copy.email}<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-pine" /></label>
              <label className="block text-xs font-medium text-ink-soft">{copy.password}<input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-pine" /></label>
              {error ? <p className="text-xs text-red-600" role="alert">{error}</p> : null}
              <button type="submit" disabled={busy} className="btn-primary w-full px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-60">{busy ? "…" : mode === "signup" ? copy.submitSignUp : copy.submitSignIn}</button>
            </form>
            <button type="button" className="mt-4 w-full text-xs text-muted underline underline-offset-4" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); }}>
              {mode === "signup" ? copy.switchSignIn : copy.switchSignUp}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function UserButton() {
  const user = useCurrentUser();
  // Sign-out can take a moment (and can fail when deployed), so the control
  // shows it is working and cannot be fired twice.
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateSessionOnServer,
  );
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <div className="flex items-center gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="text-sm font-medium">{label}</span>
      {authEnabled && !gateSession && (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            // Success navigates away; on failure re-enable so it can be retried.
            void signOut().catch(() => setSigningOut(false));
          }}
          className="cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      )}
    </div>
  );
}
