"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSiteLanguage } from "../lib/site-language";
import styles from "./MeetingRoom.module.css";

export default function MeetingRoom({ userDisplayName, canViewRecordingPassword }: { userDisplayName: string; canViewRecordingPassword: boolean }) {
  const language = useSiteLanguage();
  const copy = {
    pt: {
      live: "Sala ao vivo",
      description: "Sala exclusiva para reuniões, apresentações e treinamentos da Equipe iTERACARE BRASIL. Cada sala tem duração máxima de 2 horas.",
      enter: "Entrar na reunião", loading: "Preparando sala…", error: "Não foi possível entrar na sala.", signout: "Sair", remaining: "Tempo restante", ended: "O período de 2 horas terminou. Crie uma nova sessão para continuar.",
      invite: "Convidar participantes", preparingInvite: "Gerando convite…", inviteTitle: "Link para os participantes", inviteHelp: "Envie este link apenas às pessoas convidadas. Ele expira em até 2 horas.", copyLink: "Copiar link", copied: "Link copiado!", inviteError: "Não foi possível gerar o convite agora.", close: "Fechar",
      recording: "Entrar com gravação", recordingTitle: "Permissão para gravar", recordingHelp: "Digite a senha de gravação antes de entrar. Depois, use o botão Gravar dentro da sala.", recordingPassword: "Senha de gravação", revealPassword: "Mostrar minha senha", revealingPassword: "Buscando senha…", enterRecording: "Entrar e liberar gravação", cancelRecording: "Cancelar",
    },
    es: {
      live: "Sala en vivo",
      description: "Sala exclusiva para reuniones, presentaciones y capacitaciones del Equipo iTERACARE BRASIL. Cada sala tiene una duración máxima de 2 horas.",
      enter: "Entrar a la reunión", loading: "Preparando sala…", error: "No fue posible entrar a la sala.", signout: "Salir", remaining: "Tiempo restante", ended: "El período de 2 horas terminó. Crea una nueva sesión para continuar.",
      invite: "Invitar participantes", preparingInvite: "Generando invitación…", inviteTitle: "Enlace para los participantes", inviteHelp: "Envía este enlace solo a las personas invitadas. Expira en un máximo de 2 horas.", copyLink: "Copiar enlace", copied: "¡Enlace copiado!", inviteError: "No fue posible generar la invitación ahora.", close: "Cerrar",
      recording: "Entrar con grabación", recordingTitle: "Permiso para grabar", recordingHelp: "Introduce la contraseña de grabación antes de entrar. Después, utiliza el botón Grabar dentro de la sala.", recordingPassword: "Contraseña de grabación", revealPassword: "Mostrar mi contraseña", revealingPassword: "Buscando contraseña…", enterRecording: "Entrar y habilitar grabación", cancelRecording: "Cancelar",
    },
    en: {
      live: "Live room",
      description: "Exclusive room for iTERACARE BRASIL Team meetings, presentations, and training. Each room has a maximum duration of 2 hours.",
      enter: "Join meeting", loading: "Preparing room…", error: "The room could not be opened.", signout: "Sign out", remaining: "Time remaining", ended: "The 2-hour period has ended. Create a new session to continue.",
      invite: "Invite participants", preparingInvite: "Creating invitation…", inviteTitle: "Participant link", inviteHelp: "Share this link only with invited participants. It expires within 2 hours.", copyLink: "Copy link", copied: "Link copied!", inviteError: "The invitation could not be created right now.", close: "Close",
      recording: "Join with recording", recordingTitle: "Recording permission", recordingHelp: "Enter the recording password before joining. Then use the Record button inside the room.", recordingPassword: "Recording password", revealPassword: "Show my password", revealingPassword: "Retrieving password…", enterRecording: "Join and enable recording", cancelRecording: "Cancel",
    },
  }[language];
  const [roomUrl, setRoomUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(2 * 60 * 60);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showRecording, setShowRecording] = useState(false);
  const [recordingPassword, setRecordingPassword] = useState("");
  const [recordingPasswordLoading, setRecordingPasswordLoading] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setRoomUrl("");
        setExpiresAt(null);
        setError(copy.ended);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, copy.ended]);

  const timerLabel = [Math.floor(secondsLeft / 3600), Math.floor((secondsLeft % 3600) / 60), secondsLeft % 60]
    .map((value) => String(value).padStart(2, "0")).join(":");

  async function enter(enableRecording = false) {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/meetings/session", {
        method: "POST",
        headers: enableRecording ? { "Content-Type": "application/json" } : undefined,
        body: enableRecording ? JSON.stringify({ recordingPassword }) : undefined,
      });
      const data = await response.json() as { url?: string; expiresAt?: number; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || copy.error);
      setRoomUrl(data.url);
      setExpiresAt(Number(data.expiresAt));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.error);
    } finally { setLoading(false); }
  }

  async function revealRecordingPassword() {
    setRecordingPasswordLoading(true); setError("");
    try {
      const response = await fetch("/api/meetings/recording-password", { cache: "no-store" });
      const data = await response.json() as { password?: string; error?: string };
      if (!response.ok || !data.password) throw new Error(data.error || copy.error);
      setRecordingPassword(data.password);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.error);
    } finally { setRecordingPasswordLoading(false); }
  }

  async function createInvite() {
    setInviteLoading(true); setInviteError(""); setCopied(false);
    try {
      const response = await fetch("/api/meetings/invite", { method: "POST" });
      const data = await response.json() as { inviteUrl?: string; error?: string };
      if (!response.ok || !data.inviteUrl) throw new Error(data.error || copy.inviteError);
      setInviteUrl(data.inviteUrl);
    } catch (requestError) {
      setInviteError(requestError instanceof Error ? requestError.message : copy.inviteError);
    } finally { setInviteLoading(false); }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      document.querySelector<HTMLInputElement>('[data-invite-link="true"]')?.select();
    }
  }

  const invitePanel = inviteUrl ? (
    <div className={`${styles.invitePanel} ${roomUrl ? styles.invitePanelRoom : ""}`}>
      <button className={styles.closeInvite} onClick={() => setInviteUrl("")} aria-label={copy.close}>×</button>
      <strong>{copy.inviteTitle}</strong><p>{copy.inviteHelp}</p>
      <div className={styles.inviteField}>
        <input data-invite-link="true" value={inviteUrl} readOnly aria-label={copy.inviteTitle} />
        <button onClick={() => void copyInvite()}>{copied ? copy.copied : copy.copyLink}</button>
      </div>
    </div>
  ) : null;

  return <main className={styles.page}>
    <header><a href="/"><img src="/brand/prife-brasil-original.png" alt="Prife Brasil" /></a><nav><Link href="/leads">Prospector</Link><Link href="/crm">CRM</Link><Link href="/ponto-vivo">PontoVivo</Link><a href="/auth/signout">{copy.signout}</a></nav></header>
    {!roomUrl ? <section className={styles.welcome}>
      <small>ÁREA EXCLUSIVA • {userDisplayName}</small><h1>{copy.live.split(" ")[0]} <em>{copy.live.split(" ").slice(1).join(" ")}</em></h1><p>{copy.description}</p>
      <div className={styles.actions}><button onClick={() => void enter()} disabled={loading}>{loading ? copy.loading : copy.enter}</button><button className={styles.secondaryButton} onClick={() => void createInvite()} disabled={inviteLoading}>{inviteLoading ? copy.preparingInvite : copy.invite}</button><button className={styles.secondaryButton} onClick={() => setShowRecording((current) => !current)}>{copy.recording}</button></div>
      {showRecording && <div className={styles.recordingPanel}>
        <strong>{copy.recordingTitle}</strong><p>{copy.recordingHelp}</p>
        <label htmlFor="recording-password">{copy.recordingPassword}</label>
        <div className={styles.recordingField}><input id="recording-password" type="password" autoComplete="off" value={recordingPassword} onChange={(event) => { setRecordingPassword(event.target.value); setError(""); }} /><button onClick={() => void enter(true)} disabled={loading || recordingPassword.length < 8}>{loading ? copy.loading : copy.enterRecording}</button></div>
        <div className={styles.recordingHelpers}>{canViewRecordingPassword && <button onClick={() => void revealRecordingPassword()} disabled={recordingPasswordLoading}>{recordingPasswordLoading ? copy.revealingPassword : copy.revealPassword}</button>}<button onClick={() => { setShowRecording(false); setRecordingPassword(""); }}>{copy.cancelRecording}</button></div>
      </div>}
      {error && <div className={styles.alert} role="alert">{error}</div>}{inviteError && <div className={styles.alert} role="alert">{inviteError}</div>}{invitePanel}
    </section> : <section className={styles.room}>
      <div className={styles.timer} aria-live="polite"><span>{copy.remaining}</span><strong>{timerLabel}</strong></div>
      <button className={styles.roomInviteButton} onClick={() => void createInvite()} disabled={inviteLoading}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9-4v6m-3-3h6" /></svg>
        <span>{inviteLoading ? copy.preparingInvite : copy.invite}</span>
      </button>
      {inviteError && <div className={styles.roomError} role="alert">{inviteError}</div>}{invitePanel}
      <iframe src={roomUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" title={copy.live} />
    </section>}
  </main>;
}
