import type { Metadata } from "next";
import { headers } from "next/headers";
import AppBootstrap from "./AppBootstrap";
import BackgroundMusic from "./components/BackgroundMusic";
import ITeraAssistant from "./components/ITeraAssistant";
import { getCurrentTenantSiteProfile, internationalWhatsAppNumber, publicProfileScript, resolveCurrentTenantSite } from "./lib/tenant-site";

const products = [
  ["iTeraCare Classic Plus", "Tecnologia de terahertz em um aparelho de design premium para a rotina de bem-estar."],
  ["Vitality Energy", "Pulseiras de uso diário em três modelos, com design elegante e geração de íons negativos."],
  ["Envy Sun", "Óculos solares que combinam proteção, conforto visual e a assinatura Prife."],
  ["iTera-Bio Lite", "Tecnologia criada para uma experiência de relaxamento e bem-estar diário."],
  ["Renew Patch", "Patch não transdérmico desenvolvido com tecnologia de biofield e ressonância."],
  ["Envy Specs", "Óculos de design moderno voltados ao conforto visual e à personalidade."],
  ["MagnoSeek", "Tecnologia informativa e não invasiva que integra IA, bio-ressonância e análise de dados."],
  ["iON Shield", "Ionizador de ar portátil, leve e silencioso, desenvolvido para acompanhar a rotina diária."],
];

const faq = [
  ["O que é a Prife?", "A Prife é uma empresa internacional com um ecossistema de produtos voltados ao bem-estar, tecnologia e estilo de vida."],
  ["Como conhecer os produtos?", "Solicite uma apresentação personalizada com Williams Costa Leite para conhecer as características de cada linha."],
  ["Existe oportunidade de negócio?", "A Prife também possui um modelo de empreendedorismo. Detalhes, regras e condições são apresentados individualmente."],
  ["Os produtos substituem tratamento médico?", "Não. Tecnologias de bem-estar não substituem diagnóstico, prescrição ou acompanhamento de profissionais de saúde."],
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function currentPublicOrigin() {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "")
    .toLowerCase()
    .split(":")[0];
  if (host === "prife-brasil.com" || host === "www.prife-brasil.com" || host.endsWith(".prife-brasil.com")) {
    return `https://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.prife-brasil.com";
}

export async function generateMetadata(): Promise<Metadata> {
  const [tenant, origin] = await Promise.all([getCurrentTenantSiteProfile(), currentPublicOrigin()]);
  const businessName = tenant?.business_name || "Prife Brasil";
  const ownerName = tenant?.owner_name || "Williams Costa Leite";
  const isPrimary = !tenant?.slug || tenant.slug === "williams";
  const title = isPrimary
    ? "Prife Brasil | Tecnologias de bem-estar e oportunidade"
    : `${businessName} | Tecnologias Prife e iTeraCare`;
  const description = tenant?.description?.trim() ||
    `Conheça as tecnologias de bem-estar, produtos e a oportunidade Prife apresentados por ${ownerName}. Atendimento em português, espanhol e inglês.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: origin },
    openGraph: {
      type: "website",
      url: origin,
      siteName: businessName,
      title,
      description,
      locale: "pt_BR",
      alternateLocale: ["es_ES", "en_US"],
      images: [{ url: `${origin}/og-prife-brasil.webp`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og-prife-brasil.webp`] },
  };
}

export default async function Home() {
  const [resolution, origin] = await Promise.all([resolveCurrentTenantSite(), currentPublicOrigin()]);
  if (resolution.unavailable) {
    return (
      <main className="tenant-unavailable" role="main" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#010821", color: "#eefbff", textAlign: "center" }}>
        <section>
          <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" style={{ width: 180, height: "auto" }} />
          <p>PRIFE BRASIL</p>
          <h1>Site temporariamente indisponível</h1>
          <p>Este espaço está temporariamente indisponível. Entre em contato com a administração Prife Brasil para regularização.</p>
        </section>
      </main>
    );
  }
  const tenant = resolution.profile;
  const ownerName = tenant?.owner_name || "Williams Costa Leite";
  const ownerFirstName = ownerName.split(/\s+/)[0] || "Williams";
  const role = tenant?.leader_role || "Líder de Expansão";
  const description = tenant?.description || "Conheça a Prife Brasil, suas tecnologias de bem-estar e as possibilidades do mercado de tecnologias de bem-estar.";
  const portrait = tenant?.leader_image_url || (tenant?.slug && tenant.slug !== "williams" ? "/brand/prife-brasil-original.png" : "/brand/williams-costa-leite.webp");
  const whatsapp = internationalWhatsAppNumber(tenant);
  const socialProfiles = [tenant?.instagram_url, tenant?.youtube_url].filter(Boolean);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${origin}/#website`, url: origin, name: tenant?.business_name || "Prife Brasil", alternateName: "Prife Brasil", inLanguage: ["pt-BR", "es", "en"], description },
      { "@type": "Organization", "@id": `${origin}/#organization`, name: tenant?.business_name || "Prife Brasil", url: origin, logo: `${origin}/favicon-512.png`, description, sameAs: socialProfiles, contactPoint: { "@type": "ContactPoint", telephone: `+${whatsapp}`, contactType: "customer service", availableLanguage: ["Portuguese", "Spanish", "English"] } },
      { "@type": "Person", "@id": `${origin}/#representative`, name: ownerName, jobTitle: role, image: portrait.startsWith("http") ? portrait : `${origin}${portrait.startsWith("/") ? "" : "/"}${portrait}`, worksFor: { "@id": `${origin}/#organization` }, sameAs: socialProfiles },
      { "@type": "ItemList", name: "Tecnologias de bem-estar Prife", numberOfItems: products.length, itemListElement: products.map(([name, itemDescription], index) => ({ "@type": "ListItem", position: index + 1, item: { "@type": "Product", name, description: itemDescription } })) },
      { "@type": "FAQPage", mainEntity: faq.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ],
  };
  return (
    <>
      <a className="skip-link" href="#inicio">
        Ir para o conteúdo principal
      </a>
      <noscript>
        Você pode consultar as informações essenciais nesta página. Para animações,
        vídeos e o seletor de produtos, habilite o JavaScript.
      </noscript>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script dangerouslySetInnerHTML={{ __html: `window.__PRIFE_TENANT__=${publicProfileScript(tenant)};window.__PRIFE_INTEGRATIONS__=${JSON.stringify({ googleReviewUrl: process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || "" }).replace(/</g, "\\u003c")};` }} />
      <div id="app">
        <div className="seo-fallback">
          <header className="seo-nav">
            <a href="#inicio" aria-label="Prife Brasil — início">
              <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" />
            </a>
            <nav aria-label="Navegação principal">
              <a href="#sobre">Sobre</a>
              <a href="#pwg">PWG</a>
              <a href="#produtos">Tecnologias</a>
              <a href="#galeria">Galeria</a>
              <a href="#contato">Contato</a>
              <a href="/leads">Prospector</a>
              <a href="/crm">CRM</a>
              <a href="/reuniao">Sala ao vivo</a>
              <a href="/ponto-vivo">PontoVivo 3D</a>
              <a href="/privacidade">Privacidade</a>
            </nav>
          </header>
          <main>
            <section className="seo-hero" id="inicio">
              <div>
                <p>TECNOLOGIA • BEM-ESTAR • OPORTUNIDADE</p>
                <h1>Frequência e autocuidado para o seu <em>bem-estar diário.</em></h1>
                <p className="hero-intro">
                  <span className="hero-intro-line">O que hoje desperta sua <strong className="hero-intro-accent">curiosidade</strong> pode abrir novas</span>
                  <span className="hero-intro-line">possibilidades para o seu <strong className="hero-intro-accent">bem-estar</strong> e para o seu futuro.</span>
                  <span className="hero-intro-line hero-intro-line-final"><strong>Conheça todo o ecossistema da Prife.</strong></span>
                </p>
              </div>
              <img src="/products/iteracare-plus.webp" alt="iTeraCare Classic Plus" />
            </section>

            <section className="seo-section" id="sobre">
              <p>PRIFE INTERNATIONAL</p>
              <h2>Tecnologia, bem-estar e empreendedorismo para a rotina moderna.</h2>
              <p>A Prife conecta tecnologias de bem-estar a um ecossistema de desenvolvimento e oportunidade, pensado para pessoas que desejam integrar inovação, autonomia e propósito ao dia a dia.</p>
            </section>

            <section className="seo-section" id="pwg">
              <p>PWG • PRESENÇA GLOBAL</p>
              <h2>Faça parte de algo maior. Um ecossistema em expansão.</h2>
              <p>Com sede na Malásia e presença internacional informada em mais de 80 países e regiões, a Prife conecta comunidade, tecnologia e novas possibilidades profissionais.</p>
            </section>

            <section className="seo-section" id="produtos">
              <p>UNIVERSO PRIFE</p>
              <h2>Tecnologia que se integra ao seu dia.</h2>
              <div className="seo-products">
                {products.map(([name, description]) => (
                  <article key={name}><h3>{name}</h3><p>{description}</p></article>
                ))}
              </div>
            </section>

            <section className="seo-section" id="galeria">
              <p>EXPERIÊNCIA PRIFE</p>
              <h2>Momentos que conectam tecnologia e propósito.</h2>
              <p>Registros reais do lançamento, da liderança e da expansão da Prife Brasil.</p>
            </section>

            <section className="seo-section">
              <p>PERGUNTAS FREQUENTES</p>
              <h2>Informação clara. Decisão consciente.</h2>
              {faq.map(([question, answer]) => (
                <article className="seo-faq" key={question}><h3>{question}</h3><p>{answer}</p></article>
              ))}
            </section>

            <section className="seo-section seo-contact" id="contato">
              <p>PRONTO PARA O PRÓXIMO PASSO?</p>
              <h2>Escolha como quer começar.</h2>
              <p>Converse com {ownerName} em um atendimento direto e humanizado.</p>
              <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá, ${ownerFirstName}! Conheci o site da Prife Brasil e gostaria de conhecer melhor as tecnologias.`)}`} target="_blank" rel="noopener noreferrer">Falar com {ownerFirstName} no WhatsApp</a>
            </section>
            <footer className="seo-section">
              <a href="/privacidade">Política de Privacidade</a>
            </footer>
          </main>
        </div>
      </div>
      <AppBootstrap />
      <BackgroundMusic />
      <ITeraAssistant whatsappNumber={whatsapp} distributorName={ownerFirstName} />
    </>
  );
}
