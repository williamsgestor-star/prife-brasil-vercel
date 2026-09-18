"use client";

import { FormEvent, useState } from "react";

import { createClient } from "../lib/supabase/client";
import styles from "./Login.module.css";

const REQUEST_TIMEOUT_MS = 20_000;

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

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError) throw signInError;
      window.location.assign(nextPath);
    } catch {
      setError("E-mail ou senha incorretos. Confira os dados enviados pelo administrador.");
      setLoading(false);
    }
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await postWithTimeout("/api/auth/otp", { email, next: nextPath });
      setStep("code");
      setMessage("Código enviado. Verifique também as pastas Spam e Promoções.");
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

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await postWithTimeout("/api/auth/verify", { email, token: code });
      window.location.assign(nextPath);
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "A validação demorou mais que o esperado. Tente novamente."
          : requestError instanceof Error
            ? requestError.message
            : "Código inválido ou expirado. Solicite um novo código.",
      );
      setLoading(false);
    }
  }

  return (
    <div className={styles.formStack}>
      <div className={styles.loginModes} aria-label="Forma de acesso">
        <button type="button" className={loginMode === "password" ? styles.activeMode : ""} onClick={() => { setLoginMode("password"); setStep("email"); setError(""); setMessage(""); }}>E-mail e senha</button>
        <button type="button" className={loginMode === "code" ? styles.activeMode : ""} onClick={() => { setLoginMode("code"); setStep("email"); setError(""); setMessage(""); }}>Código por e-mail</button>
      </div>
      {loginMode === "password" ? (
        <form onSubmit={signInWithPassword}>
          <label htmlFor="password-email">E-mail de acesso</label>
          <input id="password-email" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="login-password">Senha</label>
          <input id="login-password" type="password" autoComplete="current-password" placeholder="Sua senha provisória" value={password} onChange={(event) => setPassword(event.target.value)} required />
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
        <form onSubmit={verifyCode}>
          <label htmlFor="login-code">Código recebido por e-mail</label>
          <input
            id="login-code"
            className={styles.codeInput}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={8}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
          <button className={styles.primaryButton} disabled={loading} type="submit">
            {loading ? "Validando…" : "Entrar na área exclusiva"}
            <span aria-hidden="true">→</span>
          </button>
          <button className={styles.textButton} type="button" onClick={() => { setStep("email"); setCode(""); setMessage(""); }}>
            Usar outro e-mail
          </button>
        </form>
      )}

      {message && <p className={styles.success} role="status">{message}</p>}
      {error && <p id="login-error" className={styles.error} role="alert">{error}</p>}
      <p className={styles.security}>Acesso individual, seguro e vinculado ao proprietário do subdomínio.</p>
    </div>
  );
}
