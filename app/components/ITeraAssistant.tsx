"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  freeQuestionReply,
  getIteraWelcomeMessage,
  type IteraReply,
} from "../lib/itera-assistant";
import type { IteraContext } from "../lib/itera-expertise";
import { useSiteLanguage, type SiteLanguage } from "../lib/site-language";
import styles from "./ITeraAssistant.module.css";

const ASSISTANT_MASCOT_VIDEO = "/assistant/itera-assistant-alpha-v7.webm";
const ASSISTANT_MASCOT_POSTER = "/assistant/itera-mascot-transparent.webp";
const ASSISTANT_MASCOT_MOBILE = "/assistant/itera-assistant-mobile-alpha-v8.webp";

function AssistantMascot({ className }: { className?: string }) {
  return (
    <>
      <video
        className={`${className ?? ""} ${styles.mascotDesktop}`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={ASSISTANT_MASCOT_POSTER}
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
      >
        <source src={ASSISTANT_MASCOT_VIDEO} type="video/webm" />
      </video>
      <img
        className={`${className ?? ""} ${styles.mascotMobile}`}
        src={ASSISTANT_MASCOT_MOBILE}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </>
  );
}

function createChatSessionId() {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `itera-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function createChatSessionKey() {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return `${window.crypto.randomUUID()}.${window.crypto.randomUUID()}`;
  }
  return `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}.${Math.random().toString(36).slice(2)}`;
}

type Message = {
  id: number;
  role: "assistant" | "visitor";
  text: string;
  showWhatsApp?: boolean;
};

type LeadIntent = "products" | "opportunity" | "support" | "travel";

const productContexts = new Set<IteraContext>([
  "catalog", "iteracare", "iterabio", "biolite", "ionshield", "magnoseek",
  "glasses", "bracelet", "renew", "oxytap", "other-product",
]);

function intentFromExchange(visitorText: string, reply: IteraReply): LeadIntent | null {
  if (/\b(suporte|apoio|já sou distribuidor|sou distribuidor|soporte|ya soy distribuidor|distributor support|i am a distributor)\b/i.test(visitorText)) return "support";
  if (reply.context === "business") return "opportunity";
  if (reply.context === "sales") return "support";
  if (reply.context === "travel") return "travel";
  if (reply.context && productContexts.has(reply.context)) return "products";
  return null;
}

function dispatchAnalytics(event: string, details: Record<string, string>) {
  window.dispatchEvent(new CustomEvent("prife:analytics", { detail: { event, ...details } }));
}

type ITeraAssistantProps = {
  whatsappNumber: string;
  distributorName: string;
};

function ITeraAssistantSession({
  whatsappNumber,
  distributorName,
  language,
}: ITeraAssistantProps & { language: SiteLanguage }) {
  const copy = {
    pt: {
      aside: "Assistente virtual iTERA",
      name: "Assistente iTERA",
      whatsappMessages: {
        products: `Olá, ${distributorName}! Conversei com o Assistente iTERA e quero conhecer melhor os produtos e tecnologias Prife.`,
        opportunity: `Olá, ${distributorName}! Conversei com o Assistente iTERA e quero entender a oportunidade de negócio Prife e como começar.`,
        support: `Olá, ${distributorName}! Já sou distribuidor(a) Prife e preciso de suporte na minha jornada.`,
        travel: `Olá, ${distributorName}! Conversei com o Assistente iTERA e quero entender o Prife Travel Club, a assinatura e os benefícios de viagem.`,
        generic: `Olá, ${distributorName}! Conversei com o Assistente iTERA no seu site e gostaria de mais informações.`,
      },
      welcomeTitle: "Olá! Eu sou o Assistente iTERA. O que você quer conhecer?",
      dialog: "Conversa com o Assistente iTERA",
      status: "Atendimento virtual",
      close: "Fechar Assistente iTERA",
      consultant: "consultor",
      whatsapp: "Falar com",
      whatsappSuffix: "no WhatsApp",
      questionLabel: "Digite sua dúvida",
      placeholder: "Como posso ajudar?",
      loading: "Carregando conversa…",
      send: "Enviar pergunta",
      open: "Abrir Assistente iTERA",
      launcherSmall: "FALAR COM",
      launcherName: "ASSISTENTE iTERA",
      chatWhatsapp: "WhatsApp com",
      disclaimer: "Respostas informativas. Tecnologias de bem-estar não substituem cuidados médicos.",
    },
    es: {
      aside: "Asistente virtual iTERA",
      name: "Asistente iTERA",
      whatsappMessages: {
        products: `¡Hola, ${distributorName}! Hablé con el Asistente iTERA y quiero conocer mejor los productos y tecnologías Prife.`,
        opportunity: `¡Hola, ${distributorName}! Hablé con el Asistente iTERA y quiero entender la oportunidad de negocio Prife y cómo empezar.`,
        support: `¡Hola, ${distributorName}! Ya soy distribuidor(a) Prife y necesito soporte en mi camino.`,
        travel: `¡Hola, ${distributorName}! Hablé con el Asistente iTERA y quiero entender Prife Travel Club, la suscripción y los beneficios de viaje.`,
        generic: `¡Hola, ${distributorName}! Hablé con el Asistente iTERA en su sitio y quisiera más información.`,
      },
      welcomeTitle: "¡Hola! Soy el Asistente iTERA. ¿Qué quieres conocer?",
      dialog: "Conversación con el Asistente iTERA",
      status: "Atención virtual",
      close: "Cerrar Asistente iTERA",
      consultant: "consultor",
      whatsapp: "Hablar con",
      whatsappSuffix: "por WhatsApp",
      questionLabel: "Escribe tu pregunta",
      placeholder: "¿Cómo puedo ayudarte?",
      loading: "Cargando conversación…",
      send: "Enviar pregunta",
      open: "Abrir Asistente iTERA",
      launcherSmall: "HABLAR CON",
      launcherName: "ASISTENTE iTERA",
      chatWhatsapp: "WhatsApp con",
      disclaimer: "Respuestas informativas. Las tecnologías de bienestar no sustituyen la atención médica.",
    },
    en: {
      aside: "iTERA virtual assistant",
      name: "iTERA Assistant",
      whatsappMessages: {
        products: `Hello, ${distributorName}! I spoke with the iTERA Assistant and would like to learn more about Prife products and technologies.`,
        opportunity: `Hello, ${distributorName}! I spoke with the iTERA Assistant and would like to understand the Prife business opportunity and how to begin.`,
        support: `Hello, ${distributorName}! I am already a Prife distributor and need support with my journey.`,
        travel: `Hello, ${distributorName}! I spoke with the iTERA Assistant and want to understand Prife Travel Club, the membership, and its travel benefits.`,
        generic: `Hello, ${distributorName}! I spoke with the iTERA Assistant on your website and would like more information.`,
      },
      welcomeTitle: "Hello! I’m the iTERA Assistant. What would you like to explore?",
      dialog: "Chat with the iTERA Assistant",
      status: "Virtual support",
      close: "Close iTERA Assistant",
      consultant: "consultant",
      whatsapp: "Talk to",
      whatsappSuffix: "on WhatsApp",
      questionLabel: "Type your question",
      placeholder: "How can I help?",
      loading: "Loading conversation…",
      send: "Send question",
      open: "Open iTERA Assistant",
      launcherSmall: "TALK TO",
      launcherName: "iTERA ASSISTANT",
      chatWhatsapp: "WhatsApp with",
      disclaimer: "Informational answers. Wellness technologies do not replace medical care.",
    },
  }[language];
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState<IteraContext | null>(null);
  const [leadIntent, setLeadIntent] = useState<LeadIntent | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", text: getIteraWelcomeMessage(language) },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageId = useRef(1);
  const chatSessionId = useRef("");
  const chatSessionKey = useRef("");
  const safeWhatsapp = whatsappNumber.replace(/\D/g, "");
  const whatsappMessage = copy.whatsappMessages[leadIntent || "generic"];
  const whatsappHref = `https://wa.me/${safeWhatsapp}?text=${encodeURIComponent(whatsappMessage)}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setShowWelcome(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const idStorageKey = "itera-chat-session";
    const secretStorageKey = "itera-chat-session-key";
    const storedId = window.localStorage.getItem(idStorageKey);
    const storedSecret = window.localStorage.getItem(secretStorageKey);
    const sessionId = storedId || createChatSessionId();
    const sessionKey = storedSecret || createChatSessionKey();
    chatSessionId.current = sessionId;
    chatSessionKey.current = sessionKey;
    if (!storedId) window.localStorage.setItem(idStorageKey, sessionId);
    if (!storedSecret) window.localStorage.setItem(secretStorageKey, sessionKey);

    void fetch(`/api/itera/chat?sessionId=${encodeURIComponent(sessionId)}&language=${language}`, {
      headers: { "x-itera-session-key": sessionKey },
      cache: "no-store",
    }).then(async (response) => {
      const data = await response.json().catch(() => ({ messages: [] }));
      if (!active || !response.ok) return;
      const restored = Array.isArray(data.messages) ? data.messages : [];
      if (restored.length) {
        const restoredMessages = restored.map((item: { role?: string; text?: string; showWhatsApp?: boolean }, index: number) => ({
          id: index + 2,
          role: item.role === "visitor" ? "visitor" as const : "assistant" as const,
          text: String(item.text || ""),
          showWhatsApp: Boolean(item.showWhatsApp),
        })).filter((item: Message) => item.text);
        messageId.current = restoredMessages.length + 1;
        setMessages([{ id: 1, role: "assistant", text: getIteraWelcomeMessage(language) }, ...restoredMessages]);
        const restoredContext = data.context as IteraContext | null;
        if (restoredContext) setContext(restoredContext);
      }
    }).catch(() => undefined).finally(() => {
      if (active) setRestoring(false);
    });

    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function nextId() {
    messageId.current += 1;
    return messageId.current;
  }

  function openAssistant() {
    setOpen(true);
    setShowWelcome(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function appendAssistantReply(visitorText: string, reply: IteraReply, addVisitor = false) {
    setMessages((current) => [
      ...current,
      ...(addVisitor ? [{ id: nextId(), role: "visitor" as const, text: visitorText }] : []),
      { id: nextId(), role: "assistant" as const, text: reply.text, showWhatsApp: reply.showWhatsApp },
    ]);
    if (reply.context) setContext(reply.context);
    const resolvedIntent = intentFromExchange(visitorText, reply);
    if (resolvedIntent) {
      setLeadIntent(resolvedIntent);
      if (resolvedIntent !== leadIntent) dispatchAnalytics("assistant_intent_select", { intent: resolvedIntent });
    }
    window.requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    if (reply.focusQuestion) window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setQuestion("");
    setBusy(true);
    setMessages((current) => [...current, { id: nextId(), role: "visitor", text }]);
    window.requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));

    if (!chatSessionId.current) chatSessionId.current = createChatSessionId();
    if (!chatSessionKey.current) chatSessionKey.current = createChatSessionKey();

    try {
      const response = await fetch("/api/itera/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: chatSessionId.current,
          sessionKey: chatSessionKey.current,
          language,
          visitorQuestion: text,
          conversationContext: context,
        }),
      });
      const data = await response.json().catch(() => null) as { reply?: IteraReply } | null;
      if (!response.ok || !data?.reply?.text) throw new Error("assistant_unavailable");
      appendAssistantReply(text, data.reply, false);
    } catch {
      appendAssistantReply(text, freeQuestionReply(text, language, context), false);
    } finally {
      setBusy(false);
    }
  }

  function trackWhatsAppClick(location: string) {
    dispatchAnalytics("whatsapp_click", { location, intent: leadIntent || "unqualified" });
  }

  return (
    <aside className={styles.assistant} aria-label={copy.aside}>
      {showWelcome && !open && (
        <div className={styles.welcomeScene}>
          <AssistantMascot className={`${styles.welcomeRobot} ${styles.mascotVideo}`} />
          <button className={styles.welcome} type="button" onClick={openAssistant}>
            <strong>{copy.welcomeTitle}</strong>
          </button>
        </div>
      )}

      {open && (
        <section className={styles.panel} role="dialog" aria-label={copy.dialog}>
          <header className={styles.header}>
            <span className={styles.avatar}>
              <AssistantMascot className={styles.mascotVideo} />
            </span>
            <div>
              <strong>{copy.name}</strong>
              <span><i /> {copy.status}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={copy.close}>×</button>
          </header>

          <div className={styles.messages} aria-live="polite">
            {messages.map((message) => (
              <div className={message.role === "assistant" ? styles.assistantMessage : styles.visitorMessage} key={message.id}>
                <p>{message.text}</p>
                {message.showWhatsApp && safeWhatsapp && (
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsAppClick("assistant_message")}>
                    {copy.whatsapp} {distributorName || copy.consultant} {copy.whatsappSuffix}
                  </a>
                )}
              </div>
            ))}
            {busy && (
              <div className={styles.typing} role="status" aria-live="polite">
                <span /><span /><span />
              </div>
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          <form className={styles.question} onSubmit={submitQuestion}>
            <label htmlFor="itera-question">{copy.questionLabel}</label>
            <div>
              <input
                ref={inputRef}
                id="itera-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={300}
                placeholder={restoring ? copy.loading : copy.placeholder}
                disabled={busy || restoring}
              />
              <button type="submit" aria-label={copy.send} disabled={!question.trim() || busy || restoring}>➜</button>
            </div>
          </form>
          <div className={styles.panelFooter}>
            {safeWhatsapp && (
              <a className={styles.chatWhatsapp} href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsAppClick("assistant_footer")}>
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.3-4.7A8.5 8.5 0 1 1 20.5 11.7Z" />
                    <path d="M8.1 7.3c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 2c.1.3.1.5-.1.7l-.6.7c-.2.2-.1.4 0 .6.5 1 1.3 1.8 2.3 2.4.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l2 .9c.3.1.4.3.4.5 0 .4-.2 1.2-.7 1.7-.5.5-1.2.8-2 .8-1.1 0-2.6-.5-4.3-2-2-1.7-3.2-3.9-3.3-5.3 0-.7.2-1.3.5-1.7Z" />
                  </svg>
                </span>
                {copy.chatWhatsapp} {distributorName || copy.consultant}
              </a>
            )}
            <small className={styles.disclaimer}>{copy.disclaimer}</small>
          </div>
        </section>
      )}

      {!open && !showWelcome && (
        <button
          className={styles.launcher}
          type="button"
          onClick={openAssistant}
          aria-expanded="false"
          aria-label={copy.open}
        >
          <span className={styles.launcherCopy}>
            <small>{copy.launcherSmall}</small>
            <strong>{copy.launcherName}</strong>
          </span>
          <span className={styles.launcherMascot}>
            <AssistantMascot className={styles.mascotVideo} />
          </span>
        </button>
      )}
    </aside>
  );
}

export default function ITeraAssistant(props: ITeraAssistantProps) {
  const language = useSiteLanguage();
  return <ITeraAssistantSession key={language} {...props} language={language} />;
}
