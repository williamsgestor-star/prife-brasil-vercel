"use client";

import { FormEvent, useState } from "react";

import styles from "./Pending.module.css";

const REQUEST_TIMEOUT_MS = 20_000;

export default function AccessRequestForm({
  initialName,
  initialSlug,
  initialBusiness,
  status,
}: {
  initialName: string;
  initialSlug: string;
  initialBusiness: string;
  status: string;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [business, setBusiness] = useState(initialBusiness);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    setSlug(normalizedSlug);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, business, slug: normalizedSlug }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar sua solicitação agora.");
      setMessage("Solicitação enviada. A administração fará a liberação deste acesso.");
    } catch (requestError) {
      setError(requestError instanceof DOMException && requestError.name === "AbortError"
        ? "O envio demorou mais que o esperado. Tente novamente."
        : requestError instanceof Error ? requestError.message : "Não foi possível salvar sua solicitação agora.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.status}><i /> Situação: <strong>{status === "rejected" ? "revisão necessária" : "aguardando aprovação"}</strong></div>
      <label>Nome completo<input value={fullName} onChange={(event) => setFullName(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "access-request-error" : undefined} required /></label>
      <label>Nome do negócio<input value={business} onChange={(event) => setBusiness(event.target.value)} placeholder="Ex.: Prife Ciudad del Este" aria-invalid={Boolean(error)} aria-describedby={error ? "access-request-error" : undefined} required /></label>
      <label>Subdomínio desejado<div className={styles.slugField}><input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="seu-nome" aria-invalid={Boolean(error)} aria-describedby={error ? "access-request-error" : undefined} pattern="[a-zA-Z0-9-]+" required /><span>.prife-brasil.com</span></div></label>
      <button type="submit" disabled={loading}>{loading ? "Enviando…" : "Solicitar liberação"}<span>→</span></button>
      {message && <p className={styles.success} role="status">{message}</p>}
      {error && <p id="access-request-error" className={styles.error} role="alert">{error}</p>}
    </form>
  );
}
