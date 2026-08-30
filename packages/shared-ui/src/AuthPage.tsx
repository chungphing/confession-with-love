"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { DEMO_CREDENTIALS, loginUser, registerUser } from "./auth";

interface AuthPageProps {
  mode: "login" | "register";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!isLogin && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    const result = isLogin
      ? loginUser(normalized, password)
      : registerUser(normalized, password);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/");
  };

  const inputClass =
    "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3.5 py-2.5 outline-none placeholder:opacity-40 focus:border-accent";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-card p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-on-accent">
            <Icon icon="clarity:heart-solid" />
          </span>
          <div>
            <h1 className="text-xl font-bold">
              {isLogin ? "Welcome back" : "Create an account"}
            </h1>
            <p className="mt-1 text-sm opacity-60">
              {isLogin
                ? "Log in to write confessions and react"
                : "Join the grid and start confessing"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium opacity-80">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium opacity-80">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={isLogin ? "current-password" : "new-password"}
              className={inputClass}
            />
          </label>

          {!isLogin && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium opacity-80">Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className={inputClass}
              />
            </label>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-105"
          >
            {isLogin ? "Log in" : "Create account"}
          </button>
        </form>

        {isLogin && (
          <button
            type="button"
            onClick={() => {
              setEmail(DEMO_CREDENTIALS.email);
              setPassword(DEMO_CREDENTIALS.password);
            }}
            className="mt-3 w-full rounded-full border border-[var(--panel-border)] px-5 py-2.5 text-sm opacity-70 transition hover:opacity-100"
          >
            Use demo account ({DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password})
          </button>
        )}

        <p className="mt-6 text-center text-sm opacity-70">
          {isLogin ? (
            <>
              No account yet?{" "}
              <Link
                href="/register"
                className="font-semibold underline underline-offset-2 hover:opacity-100"
              >
                Create one
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold underline underline-offset-2 hover:opacity-100"
              >
                Log in
              </Link>
            </>
          )}
        </p>

        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm opacity-50 transition hover:opacity-100"
          >
            ← Back to the grid
          </Link>
        </p>
      </div>
    </div>
  );
}
