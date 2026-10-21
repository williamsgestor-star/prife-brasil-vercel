"use client";

import { useEffect, useState } from "react";

import styles from "./Privacy.module.css";

type Language = "pt" | "es" | "en";

const content = {
  pt: {
    label: "PRIVACIDADE E SEGURANÇA", title: "Política de Privacidade",
    intro: "Esta política explica de forma clara como o site Prife Brasil e seus subdomínios tratam informações pessoais, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).", updated: "Atualizada em 21 de outubro de 2026.",
    sections: [
      ["1. Quem é o responsável", "Este site é mantido por distribuidores independentes PRIFE. O site principal é de responsabilidade de Williams Costa Leite, e cada subdomínio é de responsabilidade do distribuidor identificado nele. Este não é o site oficial da Prife International."],
      ["2. Dados tratados", "Podemos tratar nome, e-mail, telefone, dados de autenticação, informações de contato enviadas voluntariamente, mensagens enviadas ao assistente iTERA, dados de leads importados pelo usuário autorizado e dados técnicos básicos de acesso."],
      ["3. Finalidades", "Os dados são usados para atendimento, autenticação, administração dos subdomínios, CRM, segurança, funcionamento das ferramentas contratadas e, quando habilitado, medição agregada de desempenho do site."],
      ["4. Fornecedores e transferência internacional", "Utilizamos fornecedores necessários à operação: Vercel (hospedagem), Supabase (autenticação e banco de dados), Daily (salas de reunião), Groq (respostas do assistente com inteligência artificial) e Google Analytics somente quando configurado. Alguns ficam fora do Brasil, e a transferência segue as regras da LGPD. Não vendemos dados pessoais."],
      ["5. Assistente com inteligência artificial", "As perguntas digitadas no assistente iTERA são enviadas a um provedor de IA apenas para gerar a resposta. Não digite dados de saúde, documentos ou senhas. As respostas são informativas e não substituem orientação médica ou profissional."],
      ["6. Cookies e métricas", "Podem ser usados armazenamento local e cookies técnicos para idioma, sessão e segurança. Métricas do Google Analytics somente são coletadas quando a integração estiver ativa."],
      ["7. Segurança e retenção", "Aplicamos conexão segura (HTTPS), controles de acesso e separação por subdomínio. Os dados são mantidos pelo tempo necessário às finalidades descritas, obrigações legais e proteção contra fraude."],
      ["8. Seus direitos", "Você pode solicitar confirmação, acesso, correção, anonimização, exclusão, portabilidade, informações sobre compartilhamento e revogação do consentimento, conforme o art. 18 da LGPD."],
      ["9. Contato", "Para exercer seus direitos, utilize o canal de WhatsApp ou e-mail exibido no rodapé do site e informe que a solicitação é relacionada à privacidade. Respondemos em até 15 dias."],
    ], back: "Voltar ao site",
  },
  es: {
    label: "PRIVACIDAD Y SEGURIDAD", title: "Política de Privacidad",
    intro: "Esta política explica claramente cómo el sitio Prife Brasil y sus subdominios tratan la información personal, de acuerdo con la Ley General de Protección de Datos de Brasil (LGPD) y la legislación aplicable.", updated: "Actualizada el 21 de octubre de 2026.",
    sections: [
      ["1. Responsable", "Este sitio es mantenido por distribuidores independientes PRIFE. El sitio principal es responsabilidad de Williams Costa Leite y cada subdominio es responsabilidad del distribuidor identificado en él. Este no es el sitio oficial de Prife International."],
      ["2. Datos tratados", "Podemos tratar nombre, correo, teléfono, datos de autenticación, información de contacto enviada voluntariamente, mensajes enviados al asistente iTERA, leads importados por el usuario autorizado y datos técnicos básicos de acceso."],
      ["3. Finalidades", "Los datos se utilizan para atención, autenticación, administración de subdominios, CRM, seguridad, funcionamiento de las herramientas y, cuando esté habilitado, medición agregada del sitio."],
      ["4. Proveedores y transferencia internacional", "Usamos proveedores necesarios para la operación: Vercel (alojamiento), Supabase (autenticación y base de datos), Daily (reuniones), Groq (respuestas del asistente con inteligencia artificial) y Google Analytics solamente cuando esté configurado. Algunos están fuera de Brasil. No vendemos datos personales."],
      ["5. Asistente con inteligencia artificial", "Las preguntas escritas en el asistente iTERA se envían a un proveedor de IA solo para generar la respuesta. No escriba datos de salud, documentos ni contraseñas. Las respuestas son informativas y no sustituyen la orientación médica o profesional."],
      ["6. Cookies y métricas", "Se puede utilizar almacenamiento local y cookies técnicas para idioma, sesión y seguridad. Google Analytics solo recopila métricas cuando la integración está activa."],
      ["7. Seguridad y conservación", "Aplicamos conexión segura (HTTPS), controles de acceso y separación por subdominio. Los datos se conservan durante el tiempo necesario para las finalidades descritas y las obligaciones legales."],
      ["8. Sus derechos", "Puede solicitar confirmación, acceso, corrección, anonimización, eliminación, portabilidad, información sobre el intercambio de datos y revocación del consentimiento, según la legislación aplicable."],
      ["9. Contacto", "Para ejercer sus derechos, utilice el WhatsApp o correo que aparece en el pie de página del sitio e indique que se trata de una solicitud de privacidad. Respondemos en hasta 15 días."],
    ], back: "Volver al sitio",
  },
  en: {
    label: "PRIVACY AND SECURITY", title: "Privacy Policy",
    intro: "This policy clearly explains how the Prife Brasil website and its subdomains process personal information under Brazil's General Data Protection Law (LGPD) and other applicable law.", updated: "Updated on October 21, 2026.",
    sections: [
      ["1. Who is responsible", "This website is run by independent PRIFE distributors. The main website is the responsibility of Williams Costa Leite, and each subdomain is the responsibility of the distributor named on it. This is not the official Prife International website."],
      ["2. Data we process", "We may process names, email addresses, phone numbers, authentication data, voluntarily submitted contact information, messages sent to the iTERA assistant, leads imported by authorized users and basic technical access data."],
      ["3. Purposes", "Data is used for customer service, authentication, subdomain administration, CRM, security, operation of authorized tools and, when enabled, aggregate website performance measurement."],
      ["4. Providers and international transfers", "We use providers required for operation: Vercel (hosting), Supabase (authentication and database), Daily (meeting rooms), Groq (AI assistant replies) and Google Analytics only when configured. Some are located outside Brazil. We do not sell personal data."],
      ["5. AI assistant", "Questions typed into the iTERA assistant are sent to an AI provider only to generate the reply. Do not enter health data, documents or passwords. Replies are informational and do not replace medical or professional advice."],
      ["6. Cookies and analytics", "Local storage and technical cookies may be used for language, session and security. Google Analytics metrics are only collected when that integration is enabled."],
      ["7. Security and retention", "We use secure connections (HTTPS), access controls and subdomain separation. Data is retained for as long as necessary for the stated purposes, legal obligations and fraud prevention."],
      ["8. Your rights", "You may request confirmation, access, correction, anonymization, deletion, portability, information about data sharing and withdrawal of consent, subject to applicable law."],
      ["9. Contact", "To exercise your rights, use the WhatsApp or email shown in the website footer and state that your request concerns privacy. We reply within 15 days."],
    ], back: "Back to website",
  },
} satisfies Record<Language, { label: string; title: string; intro: string; updated: string; sections: string[][]; back: string }>;

export default function PrivacyContent() {
  const [language, setLanguage] = useState<Language>("pt");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("prife-language");
      if (saved === "pt" || saved === "es" || saved === "en") setLanguage(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const copy = content[language];

  return (
    <main className={styles.page} lang={language === "pt" ? "pt-BR" : language}>
      <header className={styles.header}>
        <a href="/" aria-label={copy.back}><img src="/brand/prife-brasil-original.png" alt="Prife Brasil" /></a>
        <nav aria-label="Language / Idioma">
          {(["pt", "es", "en"] as Language[]).map((item) => (
            <button key={item} type="button" className={language === item ? styles.active : ""} aria-pressed={language === item} onClick={() => { setLanguage(item); window.localStorage.setItem("prife-language", item); }}>{item.toUpperCase()}</button>
          ))}
        </nav>
      </header>
      <article className={styles.card}>
        <span>{copy.label}</span><h1>{copy.title}</h1><p className={styles.intro}>{copy.intro}</p><small>{copy.updated}</small>
        <div className={styles.sections}>{copy.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}</div>
        <a className={styles.back} href="/">{copy.back} <b aria-hidden="true">→</b></a>
      </article>
    </main>
  );
}
