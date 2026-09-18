"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSiteLanguage } from "../../lib/site-language";
import styles from "../MeetingRoom.module.css";

export default function GuestMeeting({ invite }: { invite: string }) {
  const language = useSiteLanguage();
  const copy = {
    pt: { title: "Você foi convidado", accent: "para uma reunião", text: "Informe seu nome para entrar na sala ao vivo da Equipe iTERACARE BRASIL.", name: "Seu nome", placeholder: "Digite seu nome completo", join: "Entrar na sala", joining: "Entrando…", invalid: "Este convite é inválido ou não foi informado.", error: "Não foi possível entrar na sala.", remaining: "Tempo restante", back: "Voltar ao site", recordingChoice: "Recebi autorização para gravar", recordingPassword: "Senha de gravação", recordingHelp: "Preencha somente se o administrador compartilhou a senha com você." },
    es: { title: "Has sido invitado", accent: "a una reunión", text: "Escribe tu nombre para entrar a la sala en vivo del Equipo iTERACARE BRASIL.", name: "Tu nombre", placeholder: "Escribe tu nombre completo", join: "Entrar a la sala", joining: "Entrando…", invalid: "Esta invitación no es válida o no fue informada.", error: "No fue posible entrar a la sala.", remaining: "Tiempo restante", back: "Volver al sitio", recordingChoice: "Recibí autorización para grabar", recordingPassword: "Contraseña de grabación", recordingHelp: "Complétala solo si el administrador compartió la contraseña contigo." },
    en: { title: "You are invited", accent: "to a meeting", text: "Enter your name to join the iTERACARE BRASIL Team live room.", name: "Your name", placeholder: "Enter your full name", join: "Join the room", joining: "Joining…", invalid: "This invitation is invalid or missing.", error: "The room could not be opened.", remaining: "Time remaining", back: "Back to website", recordingChoice: "I received permission to record", recordingPassword: "Recording password", recordingHelp: "Only fill this in if the administrator shared the password with you." },
  }[language];
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(invite ? "" : copy.invalid);
  const [roomUrl, setRoomUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(2 * 60 * 60);
  const [wantsRecording, setWantsRecording] = useState(false);
  const [recordingPassword, setRecordingPassword] = useState("");

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) { setRoomUrl(""); setError(copy.invalid); }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, copy.invalid]);

  const timerLabel = [Math.floor(secondsLeft / 3600), Math.floor((secondsLeft % 3600) / 60), secondsLeft % 60]
    .map((value) => String(value).padStart(2, "0")).join(":");

  function chooseLanguage(nextLanguage: "pt" | "es" | "en") {
    window.localStorage.setItem("prife-language", nextLanguage);
    document.documentElement.lang = nextLanguage === "pt" ? "pt-BR" : nextLanguage;
  }

  const languageButtonStyle = {
    padding: "9px 11px", border: "1px solid rgba(25,222,242,.35)", borderRadius: 999,
    fontSize: 11, fontWeight: 800, cursor: "pointer",
  } as const;

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invite) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/meetings/guest-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invite, name, recordingPassword: wantsRecording ? recordingPassword : "" }) });
      const data = await response.json() as { url?: string; expiresAt?: number; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || copy.error);
      setRoomUrl(data.url); setExpiresAt(Number(data.expiresAt));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.error);
    } finally { setLoading(false); }
  }

  return <main className={styles.page}>
    <header><a href="/"><img src="/brand/prife-brasil-original.png" alt="Prife Brasil" /></a><nav><button style={{ ...languageButtonStyle, background: language === "pt" ? "#40dfed" : "transparent", color: language === "pt" ? "#021026" : "#dffcff" }} onClick={() => chooseLanguage("pt")} aria-pressed={language === "pt"}>PT</button><button style={{ ...languageButtonStyle, background: language === "es" ? "#40dfed" : "transparent", color: language === "es" ? "#021026" : "#dffcff" }} onClick={() => chooseLanguage("es")} aria-pressed={language === "es"}>ES</button><button style={{ ...languageButtonStyle, background: language === "en" ? "#40dfed" : "transparent", color: language === "en" ? "#021026" : "#dffcff" }} onClick={() => chooseLanguage("en")} aria-pressed={language === "en"}>EN</button><a href="/">{copy.back}</a></nav></header>
    {!roomUrl ? <section className={styles.guestWelcome}><div className={styles.guestCard}>
      <small>CONVITE • SALA AO VIVO</small><h1>{copy.title}<em>{copy.accent}</em></h1><p>{copy.text}</p>
      <form onSubmit={(event) => void join(event)}><label htmlFor="guest-name">{copy.name}</label><input id="guest-name" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder={copy.placeholder} minLength={2} maxLength={80} aria-invalid={Boolean(error)} aria-describedby={error ? "guest-meeting-error" : undefined} required disabled={!invite || loading} />
        <label className={styles.recordingChoice}><input type="checkbox" checked={wantsRecording} onChange={(event) => { setWantsRecording(event.target.checked); if (!event.target.checked) setRecordingPassword(""); setError(""); }} /><span>{copy.recordingChoice}</span></label>
        {wantsRecording && <div className={styles.guestRecordingField}><label htmlFor="guest-recording-password">{copy.recordingPassword}</label><input id="guest-recording-password" type="password" autoComplete="off" value={recordingPassword} onChange={(event) => { setRecordingPassword(event.target.value); setError(""); }} minLength={8} required /><small>{copy.recordingHelp}</small></div>}
        <button type="submit" disabled={!invite || loading || (wantsRecording && recordingPassword.length < 8)}>{loading ? copy.joining : copy.join}</button></form>
      {error && <div id="guest-meeting-error" className={styles.alert} role="alert">{error}</div>}
    </div></section> : <section className={styles.room}><div className={styles.timer} aria-live="polite"><span>{copy.remaining}</span><strong>{timerLabel}</strong></div><iframe src={roomUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" title={copy.title} /></section>}
  </main>;
}
