"use client";

import { useEffect, useState } from "react";
import { subscriptionStatus, type SiteSubscription } from "../lib/site-subscription";
import styles from "./SubscriptionPanel.module.css";

type PaymentPlan = "monthly" | "semiannual" | "annual";
type Referral = { slot: number; name: string; date: string };

const emptyReferrals = (): Referral[] => Array.from({ length: 5 }, (_, index) => ({ slot: index + 1, name: "", date: "" }));

const paymentPlans: Array<{ id: PaymentPlan; title: string; price: string; period: string; message: string }> = [
  { id: "monthly", title: "Mensal", price: "R$ 29,90", period: "+30 dias", message: "30 dias" },
  { id: "semiannual", title: "Semestral", price: "R$ 150,00", period: "+6 meses", message: "6 meses" },
  { id: "annual", title: "Anual", price: "R$ 300,00", period: "+12 meses", message: "12 meses" },
];

function dateLabel(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)) : "Não definido";
}

export default function SubscriptionPanel({ tenantId, slug, subscription, now, onChange }: {
  tenantId: string; slug: string; subscription?: SiteSubscription | null; now: number;
  onChange: (value: SiteSubscription | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [registeredNow, setRegisteredNow] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>(emptyReferrals);
  const [referralsBusy, setReferralsBusy] = useState(false);
  const [referralsMessage, setReferralsMessage] = useState("");
  const localDay = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value)) : null;
  const paidToday = registeredNow || localDay(subscription?.last_paid_at) === localDay(new Date(now).toISOString());
  const completedReferrals = referrals.filter((item) => item.name.trim() && item.date).length;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/referrals?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível carregar as indicações.");
        const loaded = emptyReferrals();
        for (const row of result.referrals || []) {
          const index = Number(row.slot_number) - 1;
          if (index >= 0 && index < 5) loaded[index] = { slot: index + 1, name: row.referred_name || "", date: row.referred_at || "" };
        }
        setReferrals(loaded);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReferralsMessage(error instanceof Error ? error.message : "Não foi possível carregar as indicações.");
      });
    return () => controller.abort();
  }, [tenantId]);

  function updateReferral(slot: number, field: "name" | "date", value: string) {
    setReferrals((current) => current.map((item) => item.slot === slot ? { ...item, [field]: value } : item));
    setReferralsMessage("");
  }

  async function saveReferrals() {
    if (referralsBusy) return;
    setReferralsBusy(true); setReferralsMessage("");
    try {
      const response = await fetch("/api/admin/referrals", {
        method: "PUT", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ tenantId, referrals }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar as indicações.");
      setReferralsMessage("Indicações salvas.");
    } catch (error) {
      setReferralsMessage(error instanceof Error ? error.message : "Não foi possível salvar as indicações.");
    } finally { setReferralsBusy(false); }
  }

  async function act(action: "toggle" | "payment", plan?: PaymentPlan) {
    if (busy) return;
    if (action === "payment" && paidToday) {
      setMessage("Já existe um pagamento registrado hoje para este subdomínio.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      const selectedPlan = paymentPlans.find((item) => item.id === plan);
      const response = await fetch("/api/admin/subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ tenantId, action, enabled: subscription?.enabled === false, plan, requestId: crypto.randomUUID() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao salvar.");
      onChange(result.subscription);
      if (action === "payment") setRegisteredNow(true);
      setMessage(action === "payment" ? `Pagamento ${selectedPlan?.title.toLowerCase()} registrado. Prazo renovado por ${selectedPlan?.message} e site reativado.` : "Controle do subdomínio atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar.");
      // Reconcile a response lost after commit; never repeat a payment blindly.
      try {
        const response = await fetch(`/api/admin/subscriptions?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (response.ok) onChange((await response.json()).subscription);
      } catch { /* The message tells the administrator to verify before retrying. */ }
    } finally { setBusy(false); }
  }
  return <section className={styles.panel} aria-label="Ativação e mensalidade">
    <header><div><h2>Ativação e mensalidade</h2><p>{subscriptionStatus(subscription, now)}</p></div>
      <button type="button" disabled={busy} onClick={() => void act("toggle")}>{subscription?.enabled === false ? "Desbloquear site" : "Bloquear site"}</button></header>
    <dl><div><dt>Início</dt><dd>{dateLabel(subscription?.started_at)}</dd></div><div><dt>Vencimento da mensalidade</dt><dd>{dateLabel(subscription?.expires_at)}</dd></div><div><dt>Último pagamento registrado</dt><dd>{dateLabel(subscription?.last_paid_at)}</dd></div></dl>
    <dl className={styles.prices}><div><dt>Ativação · pagamento único</dt><dd>R$ 500,00</dd></div></dl>
    <div className={styles.referrals}>
      <div className={styles.referralHeading}>
        <div><h3>Ativação gratuita por indicação</h3><p>Indique 5 pessoas e ganhe a ativação gratuita. Registre o nome e a data de cada indicação.</p></div>
        <strong className={completedReferrals === 5 ? styles.rewardEarned : styles.progress}>{completedReferrals === 5 ? "Ativação gratuita conquistada" : `${completedReferrals} de 5 indicações`}</strong>
      </div>
      <div className={styles.referralGrid}>
        {referrals.map((referral) => <div className={styles.referralCard} key={referral.slot}>
          <span className={styles.slot} aria-hidden="true">{referral.slot}</span>
          <label>Nome da indicação<input maxLength={160} value={referral.name} onChange={(event) => updateReferral(referral.slot, "name", event.target.value)} placeholder="Nome completo" /></label>
          <label>Data da indicação<input type="date" value={referral.date} onChange={(event) => updateReferral(referral.slot, "date", event.target.value)} /></label>
        </div>)}
      </div>
      <div className={styles.referralActions}><button type="button" disabled={referralsBusy} onClick={() => void saveReferrals()}>{referralsBusy ? "Salvando..." : "Salvar indicações"}</button>{referralsMessage && <p role="status">{referralsMessage}</p>}</div>
    </div>
    <div className={styles.controls} aria-label="Registrar pagamento">
      {paymentPlans.map((plan) => <button key={plan.id} type="button" disabled={busy || paidToday} onClick={() => void act("payment", plan.id)}>
        <strong>{plan.title}</strong><span>{plan.price} · {plan.period}</span>
      </button>)}
    </div>
    {paidToday && <p className={styles.locked}>Pagamento já registrado hoje. Os botões serão liberados novamente amanhã.</p>}
    <p>O site é bloqueado automaticamente quando a mensalidade vence. O administrador também pode bloquear ou desbloquear manualmente.</p>
    <p>Ao registrar o pagamento, o vencimento avança conforme o plano escolhido e o site é reativado. É permitido somente um registro por subdomínio a cada dia.</p>
    {slug === "williams" && <p>O site principal www.prife-brasil.com permanece isento do bloqueio automático.</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
