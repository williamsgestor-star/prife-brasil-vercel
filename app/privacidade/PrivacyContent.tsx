"use client";

import { useEffect, useState } from "react";

import styles from "./Privacy.module.css";

type Language = "pt" | "es" | "en";

const content = {
  pt: {
    label: "PRIVACIDADE E SEGURANÇA", title: "Política de Privacidade",
    intro: "Esta política explica de forma clara como o site Prife Brasil e seus subdomínios tratam informações pessoais.", updated: "Atualizada em 25 de agosto de 2026.",
    sections: [
      ["1. Dados tratados", "Podemos tratar nome, e-mail, telefone, dados de autenticação, informações de contato enviadas voluntariamente, dados de leads importados pelo usuário autorizado e dados técnicos básicos de acesso."],
      ["2. Finalidades", "Os dados são usados para autenticação, administração dos subdomínios, atendimento, CRM, segurança, funcionamento das ferramentas contratadas e, quando habilitado, medição agregada de desempenho do site."],
      ["3. Compartilhamento", "Utilizamos fornecedores necessários à operação, como hospedagem, Supabase para autenticação e banco de dados, Daily para salas de reunião e Google Analytics somente quando configurado. Não vendemos dados pessoais."],
      ["4. Cookies e métricas", "Podem ser usados armazenamento local e cookies técnicos para idioma, sessão e segurança. Métricas do Google Analytics somente são coletadas quando a integração estiver ativa."],
      ["5. Segurança e retenção", "Aplicamos controles de acesso e separação por subdomínio. Os dados são mantidos pelo tempo necessário às finalidades descritas, obrigações legais e proteção contra fraude."],
      ["6. Seus direitos", "Você pode solicitar confirmação, acesso, correção, exclusão, portabilidade ou informações sobre o tratamento, conforme a legislação aplicável."],
      ["7. Contato", "Para exercer seus direitos, utilize o canal de WhatsApp ou e-mail exibido no rodapé do seu subdomínio e informe que a solicitação é relacionada à privacidade."],
    ], back: "Voltar ao site",
  },
  es: {
    label: "PRIVACIDAD Y SEGURIDAD", title: "Política de Privacidad",
    intro: "Esta política explica claramente cómo el sitio Prife Brasil y sus subdominios tratan la información personal.", updated: "Actualizada el 25 de agosto de 2026.",
    sections: [
      ["1. Datos tratados", "Podemos tratar nombre, correo, teléfono, datos de autenticación, información de contacto enviada voluntariamente, leads importados por el usuario autorizado y datos técnicos básicos de acceso."],
      ["2. Finalidades", "Los datos se utilizan para autenticación, administración de subdominios, atención, CRM, seguridad, funcionamiento de las herramientas y, cuando esté habilitado, medición agregada del sitio."],
      ["3. Proveedores", "Usamos proveedores necesarios para la operación, como alojamiento, Supabase, Daily para reuniones y Google Analytics solamente cuando esté configurado. No vendemos datos personales."],
      ["4. Cookies y métricas", "Se puede utilizar almacenamiento local y cookies técnicas para idioma, sesión y seguridad. Google Analytics solo recopila métricas cuando la integración está activa."],
      ["5. Seguridad y conservación", "Aplicamos controles de acceso y separación por subdominio. Los datos se conservan durante el tiempo necesario para las finalidades descritas y las obligaciones legales."],
      ["6. Sus derechos", "Puede solicitar confirmación, acceso, corrección, eliminación, portabilidad o información sobre el tratamiento, según la legislación aplicable."],
      ["7. Contacto", "Para ejercer sus derechos, utilice el WhatsApp o correo que aparece en el pie de página de su subdominio e indique que se trata de una solicitud de privacidad."],
    ], back: "Volver al sitio",
  },
  en: {
    label: "PRIVACY AND SECURITY", title: "Privacy Policy",
    intro: "This policy clearly explains how the Prife Brasil website and its subdomains process personal information.", updated: "Updated on August 25, 2026.",
    sections: [
      ["1. Data we process", "We may process names, email addresses, phone numbers, authentication data, voluntarily submitted contact information, leads imported by authorized users and basic technical access data."],
      ["2. Purposes", "Data is used for authentication, subdomain administration, customer service, CRM, security, operation of authorized tools and, when enabled, aggregate website performance measurement."],
      ["3. Service providers", "We use providers required for operation, including hosting, Supabase, Daily for meeting rooms and Google Analytics only when configured. We do not sell personal data."],
      ["4. Cookies and analytics", "Local storage and technical cookies may be used for language, session and security. Google Analytics metrics are only collected when that integration is enabled."],
      ["5. Security and retention", "We apply access controls and subdomain separation. Data is retained for as long as necessary for the stated purposes, legal obligations and fraud prevention."],
      ["6. Your rights", "You may request confirmation, access, correction, deletion, portability or information about processing, subject to applicable law."],
      ["7. Contact", "To exercise your rights, use the WhatsApp or email shown in your subdomain footer and state that your request concerns privacy."],
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
