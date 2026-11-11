"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { createClient } from "../lib/supabase/client";
import styles from "./Login.module.css";

const REQUEST_TIMEOUT_MS = 20_000;
const RESEND_SECONDS = 30;

function maskEmail(value: string) {
  const [user, domain] = value.trim().toLowerCase().split("@");
  if (!user || !domain) return value;
  return `${user.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(user.length - 1, 5)))}@${domain}`;
}

function buzz(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* sem vibração */ }
}

async function postWithTimeout(path: string, body: Record<string, string>) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a solicitação.");
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loginMode, setLoginMode] = useState<"password" | "code">("password");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [success, setSuccess] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const passwordRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const autoTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (loginMode === "code" && step === "code") codeRef.current?.focus();
  }, [loginMode, step]);

  function fail(text: string, clear: "password" | "code" | null) {
    setError(text);
    setShake((n) => n + 1);
    buzz([40, 40, 40]);
    if (clear === "password") { setPassword(""); window.setTimeout(() => passwordRef.current?.focus(), 40); }
    if (clear === "code") { setCode(""); window.setTimeout(() => codeRef.current?.focus(), 40); }
  }

  function succeed() {
    setSuccess(true);
    buzz(20);
    window.setTimeout(() => window.location.assign(nextPath), 650);
  }

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError) throw signInError;
      succeed();
    } catch {
      fail("E-mail ou senha incorretos. Confira os dados enviados pelo administrador.", "password");
      setLoading(false);
    }
  }

  async function sendCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await postWithTimeout("/api/auth/otp", { email, next: nextPath });
      setStep("code");
      setCode("");
      setResendIn(RESEND_SECONDS);
      setMessage("Não chegou? Veja também Spam e Promoções.");
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "O envio demorou mais que o esperado. Tente novamente."
          : requestError instanceof Error
            ? requestError.message
            : "Não foi possível enviar o código agora. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(token: string) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await postWithTimeout("/api/auth/verify", { email, token });
      succeed();
    } catch (requestError) {
      const timedOut = requestError instanceof DOMException && requestError.name === "AbortError";
      fail(
        timedOut
          ? "A validação demorou mais que o esperado. Tente novamente."
          : requestError instanceof Error
            ? requestError.message
            : "Código inválido ou expirado. Solicite um novo código.",
        timedOut ? null : "code",
      );
      setLoading(false);
    }
  }

  function onCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    setCode(digits);
    setError("");
    window.clearTimeout(autoTimer.current);
    // Confirma sozinha: no 6º número (espera um instante caso o código tenha 8)
    if (digits.length === 8) void verifyCode(digits);
    else if (digits.length === 6) autoTimer.current = window.setTimeout(() => void verifyCode(digits), 450);
  }

  return (
    <div className={styles.formStack}>
      <div className={styles.loginModes} aria-label="Forma de acesso">
        <button type="button" className={loginMode === "password" ? styles.activeMode : ""} onClick={() => { setLoginMode("password"); setStep("email"); setError(""); setMessage(""); }}>E-mail e senha</button>
        <button type="button" className={loginMode === "code" ? styles.activeMode : ""} onClick={() => { setLoginMode("code"); setStep("email"); setError(""); setMessage(""); }}>Código por e-mail</button>
      </div>
      {loginMode === "password" ? (
        <form key={`p${shake}`} className={shake ? styles.shake : undefined} onSubmit={signInWithPassword}>
          <label htmlFor="password-email">E-mail de acesso</label>
          <input id="password-email" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} required />
          <label htmlFor="login-password">Senha</label>
          <input ref={passwordRef} id="login-password" className={error ? styles.inputError : undefined} type="password" autoComplete="current-password" placeholder="Sua senha provisória" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} required />
          <button className={styles.primaryButton} disabled={loading} type="submit">
            {loading ? "Entrando…" : "Entrar na área exclusiva"}<span aria-hidden="true">→</span>
          </button>
        </form>
      ) : step === "email" ? (
        <form onSubmit={sendCode}>
          <label htmlFor="login-email">Seu melhor e-mail</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
          <button className={styles.primaryButton} disabled={loading} type="submit">
            {loading ? "Enviando…" : "Receber acesso por e-mail"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      ) : (
        <form key={`c${shake}`} className={`${styles.codeStep} ${shake ? styles.shake : ""}`} onSubmit={(event) => { event.preventDefault(); if (code.length >= 6) void verifyCode(code); }}>
          <h3 className={styles.codeTitle}>Digite o código</h3>
          <p className={styles.codeSent}>Enviado para {maskEmail(email)}</p>
          <label htmlFor="login-code" className={styles.otpBoxes} data-error={error ? "true" : undefined}>
            <input
              ref={codeRef}
              id="login-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              value={code}
              onChange={(event) => onCodeChange(event.target.value)}
              aria-label="Código de verificação recebido por e-mail"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              disabled={loading}
              required
            />
            {Array.from({ length: Math.max(6, code.length) }, (_, index) => (
              <span key={index} className={`${styles.otpBox} ${index === Math.min(code.length, Math.max(6, code.length) - 1) && !loading ? styles.otpActive : ""}`} aria-hidden="true">
                {code[index] ?? ""}
              </span>
            ))}
          </label>
          <p className={styles.codeHint} aria-live="polite">{loading ? "Verificando…" : ""}</p>
          <button className={styles.textButton} type="button" disabled={resendIn > 0 || loading} onClick={() => void sendCode()}>
            {resendIn > 0 ? `Reenviar em 0:${String(resendIn).padStart(2, "0")}` : "Reenviar código"}
          </button>
          <button className={styles.textButton} type="button" onClick={() => { setStep("email"); setCode(""); setMessage(""); setError(""); }}>
            Usar outro e-mail
          </button>
        </form>
      )}

      {message && <p className={styles.success} role="status">{message}</p>}
      {error && <p id="login-error" className={styles.error} role="alert">{error}</p>}
      {success && (
        <div className={styles.successOverlay} role="status" aria-label="Acesso liberado">
          <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
        </div>
      )}
      <p className={styles.security}>Acesso individual, seguro e vinculado ao proprietário do subdomínio.</p>
    </div>
  );
}
