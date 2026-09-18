"use client";

import { useState } from "react";

import styles from "./Admin.module.css";

const REQUEST_TIMEOUT_MS = 20_000;

type AccessRequest = {
  id: string;
  email: string;
  full_name: string | null;
  requested_subdomain_slug: string | null;
  requested_business_name: string | null;
  created_at: string;
};

export default function AdminAccessPanel({ initialRequests }: { initialRequests: AccessRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [busy, setBusy] = useState<{ id: string; action: "save" | "approve" | "reject" } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateRequest(id: string, field: keyof AccessRequest, value: string) {
    setRequests((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
    setError("");
    setSuccess("");
  }

  function validatedRequest(request: AccessRequest) {
    const fullName = request.full_name?.trim();
    const slug = request.requested_subdomain_slug?.trim().toLowerCase();
    const name = request.requested_business_name?.trim();
    if (!fullName || !slug || !name) {
      setError("Preencha o nome do proprietário, o nome do negócio e o subdomínio.");
      return null;
    }
    return { fullName, slug, name };
  }

  async function sendAction(request: AccessRequest, action: "save" | "approve" | "reject") {
    const values = action === "reject" ? null : validatedRequest(request);
    if (action !== "reject" && !values) return false;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch("/api/admin/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        requestId: request.id,
        fullName: values?.fullName,
        business: values?.name,
        slug: values?.slug,
      }),
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timeout));
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
    return values;
  }

  async function save(request: AccessRequest) {
    if (busy) return;
    setBusy({ id: request.id, action: "save" });
    setError(""); setSuccess("");
    try {
      const values = await sendAction(request, "save");
      if (!values) return;
      setRequests((current) => current.map((item) => item.id === request.id ? {
        ...item,
        full_name: values.fullName,
        requested_subdomain_slug: values.slug,
        requested_business_name: values.name,
      } : item));
      setSuccess("Informações salvas. A solicitação já pode ser aprovada.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "";
      setError(saveError instanceof DOMException && saveError.name === "AbortError"
        ? "O salvamento demorou mais que o esperado. Atualize a página e confira antes de tentar novamente."
        : message.includes("invalid_subdomain") ? "Use no subdomínio apenas letras minúsculas, números e hífen."
          : message || "Não foi possível salvar as informações.");
    } finally {
      setBusy(null);
    }
  }

  async function approve(request: AccessRequest) {
    if (busy) return;
    setBusy({ id: request.id, action: "approve" });
    setError(""); setSuccess("");
    try {
      const values = await sendAction(request, "approve");
      if (!values) return;
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setSuccess(`Acesso aprovado. O subdomínio ${values.slug}.prife-brasil.com foi criado.`);
    } catch (approveError) {
      const message = approveError instanceof Error ? approveError.message : "";
      setError(approveError instanceof DOMException && approveError.name === "AbortError"
        ? "A aprovação demorou mais que o esperado. Atualize a página e confira a lista de empresas antes de tentar novamente."
        : message.includes("duplicate") || message.includes("unique")
          ? "Este subdomínio ou proprietário já possui um espaço."
          : message || "Não foi possível aprovar a solicitação.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(request: AccessRequest) {
    if (busy) return;
    setBusy({ id: request.id, action: "reject" });
    setError(""); setSuccess("");
    try {
      await sendAction(request, "reject");
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setSuccess("Solicitação recusada.");
    } catch (rejectError) {
      const message = rejectError instanceof Error ? rejectError.message : "";
      setError(rejectError instanceof DOMException && rejectError.name === "AbortError"
        ? "A recusa demorou mais que o esperado. Atualize a página para conferir a situação."
        : message || "Não foi possível rejeitar a solicitação.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.list}>
      <div className={styles.heading}><div><span>GESTÃO DE ACESSOS</span><h1>Solicitações pendentes</h1></div><b>{requests.length}</b></div>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
      {requests.length === 0 ? (
        <div className={styles.empty}><i>✓</i><h2>Tudo em dia</h2><p>Não há solicitações aguardando aprovação.</p></div>
      ) : requests.map((request) => (
        <article className={styles.request} key={request.id}>
          <div className={styles.avatar}>{(request.full_name || request.email).slice(0,1).toUpperCase()}</div>
          <label className={styles.field}><small>PROPRIETÁRIO</small><input value={request.full_name ?? ""} onChange={(event) => updateRequest(request.id, "full_name", event.target.value)} placeholder="Nome completo" /><span>{request.email}</span></label>
          <label className={styles.field}><small>NOME DO NEGÓCIO</small><input value={request.requested_business_name ?? ""} onChange={(event) => updateRequest(request.id, "requested_business_name", event.target.value)} placeholder="Ex.: Prife Brasil Williams" /></label>
          <label className={`${styles.field} ${styles.slugField}`}><small>SUBDOMÍNIO</small><div><input value={request.requested_subdomain_slug ?? ""} onChange={(event) => updateRequest(request.id, "requested_subdomain_slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="Ex.: williams" /><span>.prife-brasil.com</span></div></label>
          <div className={styles.actions}>
            <button type="button" className={styles.reject} onClick={() => reject(request)} disabled={Boolean(busy)}>{busy?.id === request.id && busy.action === "reject" ? "Recusando…" : "Recusar"}</button>
            <button type="button" className={styles.save} onClick={() => save(request)} disabled={Boolean(busy)}>{busy?.id === request.id && busy.action === "save" ? "Salvando…" : "Salvar dados"}</button>
            <button type="button" className={styles.approve} onClick={() => approve(request)} disabled={Boolean(busy)}>{busy?.id === request.id && busy.action === "approve" ? "Processando…" : "Aprovar acesso"}</button>
          </div>
        </article>
      ))}
    </section>
  );
}
