import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { authClient, setBearerToken, signOut } from "./client";
import { hasGateSessionMarker } from "./gate-session-marker";
import { resolveSignInGateState } from "./sign-in-gate";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

function subscribeToNothing(): () => void {
  return () => {};
}

function noGateSessionOnServer(): boolean {
  return false;
}

/**
 * Gate a tree on authentication.
 *
 * Safe across all four states:
 *   - Auth enabled, signed in -> renders `children`.
 *   - Auth enabled, signed out -> renders `fallback` (or `<RedirectToSignIn />`).
 *   - Auth enabled, session loading -> renders `loading` (prevents flicker).
 *   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> renders `children` with `DEV_USER`.
 */
export function SignInGate({
  children,
  fallback,
  loading = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}) {
  const { user, isPending } = useCurrentUserState();
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateSessionOnServer,
  );
  const state = resolveSignInGateState({ user, isPending, gateSession });
  if (state === "loading") return <>{loading}</>;
  if (state === "signed-out") return <>{fallback ?? <RedirectToSignIn />}</>;
  return <>{children}</>;
}

export function RedirectToSignIn({ to = "/login" }: { to?: string }) {
  return <Navigate to={to} />;
}

export function AccountButton({ language = "en" }: { language?: "en" | "pt" }) {
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already logged in with a real account, hide the sign-in modal trigger
  if (user && !user.isDevFallback) return null;

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
        guestLogin: "Entrar como Convidado (1 clique)",
        switchSignIn: "Já tem uma conta? Entrar",
        switchSignUp: "Não tem uma conta? Cadastre-se",
        close: "Fechar",
        genericError: "Não foi possível concluir. Verifique os dados e tente novamente.",
        googleNotice:
          "O login com Google requer credenciais GOOGLE_CLIENT_ID configuradas no Free Go Server. Por favor, utilize o cadastro direto com Email e Senha abaixo (não depende de servidores externos!).",
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
        guestLogin: "Quick Guest Login (1-click)",
        switchSignIn: "Already have an account? Sign in",
        switchSignUp: "Don't have an account? Sign up",
        close: "Close",
        genericError: "Could not complete the request. Check your details and try again.",
        googleNotice:
          "Google Sign-In requires GOOGLE_CLIENT_ID configured for Free Go Server. Please use the direct Email & Password registration below (fully independent!).",
      };

  async function quickGuest() {
    setBusy(true);
    setError(null);
    try {
      const guestEmail = `guest_${Math.random().toString(36).substring(2, 8)}@freegoserver.org`;
      const guestPassword = `Guest_${Math.random().toString(36).substring(2, 10)}!`;
      const guestName = isPortuguese ? "Jogador Convidado" : "Guest Player";
      const result = await authClient.signUp.email({
        email: guestEmail,
        password: guestPassword,
        name: guestName,
      });
      if (result.error) {
        setError(result.error.message || copy.genericError);
        setBusy(false);
        return;
      }
      const token =
        result.data && typeof result.data === "object" && "token" in result.data
          ? (result.data as { token?: string }).token
          : null;
      if (token) {
        setBearerToken(token);
      }
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : copy.genericError);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({ email, password, name: name.trim() || "User" })
          : await authClient.signIn.email({ email, password });
      setBusy(false);
      if (result.error) {
        setError(result.error.message || copy.genericError);
        return;
      }
      const token =
        result.data && typeof result.data === "object" && "token" in result.data
          ? (result.data as { token?: string }).token
          : null;
      if (token) {
        setBearerToken(token);
      }
      setOpen(false);
      setEmail("");
      setPassword("");
      setName("");
      window.location.reload();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : copy.genericError);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-quiet flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium sm:text-sm"
        onClick={() => setOpen(true)}
      >
        <svg className="size-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>{copy.account}</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-dialog-title"
            className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="account-dialog-title" className="font-display text-xl font-bold text-ink">
                  {mode === "signup" ? copy.signUp : copy.signIn}
                </h2>
                <p className="mt-0.5 text-xs text-muted">Free Go Server · Conta Oficial</p>
              </div>
              <button
                type="button"
                className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-paper-2 hover:text-ink"
                onClick={() => setOpen(false)}
                aria-label={copy.close}
              >
                ✕
              </button>
            </div>

            {/* Google OAuth Button - Direct for Free Go Server */}
            <button
              type="button"
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-2 disabled:opacity-60"
              onClick={async () => {
                setError(null);
                setBusy(true);
                try {
                  // Direct Google OAuth on Free Go Server
                  const res = await authClient.signIn.social({
                    provider: "google",
                    callbackURL: "/",
                  });
                  if (res?.error) {
                    setError(copy.googleNotice);
                  }
                } catch {
                  setError(copy.googleNotice);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{copy.google}</span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void quickGuest()}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-paper-2/60 px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-pine hover:bg-pine/5 hover:text-pine disabled:opacity-60"
            >
              <span>⚡</span>
              <span>{copy.guestLogin}</span>
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              <span>{isPortuguese ? "ou com email" : "or with email"}</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            {/* Email / Password Form */}
            <form className="space-y-3" onSubmit={(event) => void submit(event)}>
              {mode === "signup" ? (
                <label className="block text-xs font-medium text-ink-soft">
                  {copy.name}
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Seu nome"
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-pine"
                  />
                </label>
              ) : null}

              <label className="block text-xs font-medium text-ink-soft">
                {copy.email}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="exemplo@email.com"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-pine"
                />
              </label>

              <label className="block text-xs font-medium text-ink-soft">
                {copy.password}
                <input
                  type="password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-pine"
                />
              </label>

              {error ? (
                <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="btn-primary mt-2 w-full justify-center px-4 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? "…" : mode === "signup" ? copy.submitSignUp : copy.submitSignIn}
              </button>
            </form>

            <button
              type="button"
              className="mt-4 w-full text-center text-xs text-muted transition-colors hover:text-ink hover:underline"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
              }}
            >
              {mode === "signup" ? copy.switchSignIn : copy.switchSignUp}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function UserButton({ language = "en" }: { language?: "en" | "pt" }) {
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateSessionOnServer,
  );

  if (!user || user.isDevFallback) return null;

  const label = user.displayName ?? user.primaryEmail ?? "User";
  const isPortuguese = language === "pt";
  const signOutLabel = isPortuguese ? "Sair" : "Sign out";
  const signingOutLabel = isPortuguese ? "Saindo…" : "Signing out…";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-paper-2 px-2.5 py-1">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="size-6 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-6 place-items-center rounded-full bg-pine text-xs font-bold text-paper">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="max-w-[120px] truncate text-xs font-semibold text-ink sm:max-w-[180px]">
        {label}
      </span>
      {!gateSession && (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
          className="ml-1 text-xs text-muted transition-colors hover:text-red-600 disabled:cursor-wait"
        >
          {signingOut ? signingOutLabel : signOutLabel}
        </button>
      )}
    </div>
  );
}
