"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./BackgroundMusic.module.css";

const VOLUME_KEY = "prife_music_volume";
const MUTED_KEY = "prife_music_muted";
const ENABLED_KEY = "prife_music_enabled";
const DEFAULT_VOLUME = 0.24;

function PlayIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5L8 5.5Z" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" /></svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {muted ? (
        <path d="m16.2 9.2 4.6 4.6m0-4.6-4.6 4.6" className={styles.iconStroke} />
      ) : (
        <path d="M16 8.2a5.4 5.4 0 0 1 0 7.6m2.5-10.1a9 9 0 0 1 0 12.6" className={styles.iconStroke} />
      )}
    </svg>
  );
}

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [blocked, setBlocked] = useState(false);
  const [footerContact, setFooterContact] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const findFooterContact = () => {
      const nextFooterContact = document.querySelector<HTMLElement>("#app footer .footer-grid > p");
      setFooterContact((current) => current === nextFooterContact ? current : nextFooterContact);
    };

    findFooterContact();
    const observer = new MutationObserver(findFooterContact);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const storedVolume = Number(window.localStorage.getItem(VOLUME_KEY));
    const initialVolume = Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1
      ? storedVolume
      : DEFAULT_VOLUME;
    const initialMuted = window.localStorage.getItem(MUTED_KEY) === "true";
    const explicitlyPaused = window.localStorage.getItem(ENABLED_KEY) === "false";

    audio.volume = initialVolume;
    audio.muted = initialMuted;
    setVolume(initialVolume);
    setMuted(initialMuted);

    if (explicitlyPaused) return;

    const startMusic = async () => {
      try {
        await audio.play();
        setBlocked(false);
      } catch {
        setBlocked(true);
      }
    };

    void startMusic();

    const startAfterInteraction = () => {
      if (window.localStorage.getItem(ENABLED_KEY) !== "false" && audio.paused) {
        void startMusic();
      }
    };

    window.addEventListener("pointerdown", startAfterInteraction, { once: true });
    window.addEventListener("keydown", startAfterInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", startAfterInteraction);
      window.removeEventListener("keydown", startAfterInteraction);
    };
  }, [footerContact]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      window.localStorage.setItem(ENABLED_KEY, "false");
      setBlocked(false);
      return;
    }

    window.localStorage.setItem(ENABLED_KEY, "true");
    try {
      await audio.play();
      setBlocked(false);
    } catch {
      setBlocked(true);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setMuted(nextMuted);
    window.localStorage.setItem(MUTED_KEY, String(nextMuted));
  };

  const changeVolume = (nextVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = nextVolume;
    setVolume(nextVolume);
    window.localStorage.setItem(VOLUME_KEY, String(nextVolume));
    if (nextVolume > 0 && audio.muted) {
      audio.muted = false;
      setMuted(false);
      window.localStorage.setItem(MUTED_KEY, "false");
    }
  };

  if (!footerContact) return null;

  return createPortal(
    <span className={styles.player} role="group" aria-label="Controles da música ambiente">
      <audio
        ref={audioRef}
        src="/audio/we-love-prife.mp3"
        loop
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        className={styles.primaryControl}
        onClick={togglePlayback}
        aria-label={playing ? "Pausar música" : "Reproduzir música"}
        title={playing ? "Pausar música" : "Reproduzir música"}
      >
        <PlayIcon paused={!playing} />
      </button>

      <span className={styles.track} aria-live="polite">
        <span>{blocked ? "ATIVAR MÚSICA" : playing ? "TOCANDO AGORA" : "TRILHA PRIFE"}</span>
        <strong>We Love Prife</strong>
      </span>

      <button
        type="button"
        className={styles.iconControl}
        onClick={toggleMute}
        aria-label={muted ? "Ativar som" : "Desativar som"}
        title={muted ? "Ativar som" : "Desativar som"}
      >
        <VolumeIcon muted={muted} />
      </button>

      <label className={styles.volume}>
        <span className={styles.srOnly}>Volume da música</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(event) => changeVolume(Number(event.target.value))}
          aria-label={`Volume da música: ${Math.round(volume * 100)}%`}
          style={{ "--music-volume": `${volume * 100}%` } as React.CSSProperties}
        />
      </label>
    </span>,
    footerContact,
  );
}
