import {
  copy,
  galleryImages as defaultGalleryImages,
  languages,
  products,
  siteConfig as defaultSiteConfig,
  videos as defaultVideos,
} from "./content.js?v=103";

const tenantSite = window.__PRIFE_TENANT__ || {};
const integrationConfig = window.__PRIFE_INTEGRATIONS__ || {};
const visualSettings = tenantSite.visual_settings && typeof tenantSite.visual_settings === "object" ? tenantSite.visual_settings : {};
const visualTexts = visualSettings.texts && typeof visualSettings.texts === "object" ? visualSettings.texts : {};
const digits = (value) => String(value || "").replace(/\D/g, "");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
const safeAssetUrl = (value, fallback = "") => {
  const candidate = String(value || "").trim();
  if (/^https?:\/\//i.test(candidate) || /^\/[a-z0-9]/i.test(candidate)) return candidate;
  return fallback;
};
const publicAssetUrl = (value) => {
  const candidate = String(value || "").trim();
  if (/^https?:\/\//i.test(candidate) || candidate.startsWith("/")) return candidate;
  return `/${candidate.replace(/^\.\//, "")}`;
};
const socialUrl = (value, network, fallback) => {
  const candidate = String(value || "").trim();
  if (!candidate) return fallback;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  const handle = candidate.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
  return `https://${network}.com/${network === "youtube" && !handle.startsWith("@") ? "@" : ""}${handle}`;
};
const socialHandle = (value, fallback) => {
  const candidate = String(value || "").trim();
  if (!candidate) return fallback;
  if (!/^https?:\/\//i.test(candidate)) return `@${candidate.replace(/^@/, "")}`;
  try { return `@${new URL(candidate).pathname.replace(/^\/@?/, "").replace(/\/$/, "")}`; } catch { return fallback; }
};
const ownerName = String(tenantSite.owner_name || "Williams Costa Leite").trim();
const zoomMeetingUrl = "https://us06web.zoom.us/j/7987553820";
const ownerFirstName = ownerName.split(/\s+/)[0] || "Williams";
const browserHostname = String(window.location.hostname || "").toLowerCase().replace(/^www\./, "");
const isPrimaryHostname = browserHostname === "prife-brasil.com" || browserHostname.endsWith(".chatgpt.site");
const isPrimaryTenant = isPrimaryHostname || !tenantSite.slug || tenantSite.slug === "williams";
const whatsappNumber = [tenantSite.whatsapp_country_code, tenantSite.whatsapp_area_code, tenantSite.whatsapp_local_number].map(digits).filter(Boolean).join("") || digits(tenantSite.whatsapp) || (isPrimaryTenant ? defaultSiteConfig.whatsappNumber : "");
const whatsappDisplay = tenantSite.whatsapp_country_code
  ? `+${digits(tenantSite.whatsapp_country_code)} ${digits(tenantSite.whatsapp_area_code)} ${digits(tenantSite.whatsapp_local_number)}`.trim()
  : defaultSiteConfig.whatsappDisplay;
const siteConfig = {
  ...defaultSiteConfig,
  whatsappNumber,
  whatsappDisplay,
  instagramUrl: socialUrl(tenantSite.instagram_url, "instagram", isPrimaryTenant ? defaultSiteConfig.instagramUrl : ""),
  instagramHandle: socialHandle(tenantSite.instagram_url, isPrimaryTenant ? defaultSiteConfig.instagramHandle : ""),
  youtubeUrl: socialUrl(tenantSite.youtube_url, "youtube", isPrimaryTenant ? defaultSiteConfig.youtubeUrl : ""),
  youtubeHandle: socialHandle(tenantSite.youtube_url, isPrimaryTenant ? defaultSiteConfig.youtubeHandle : ""),
};
const hasCustomGallery = Array.isArray(tenantSite.gallery_urls) && tenantSite.gallery_urls.length > 0;
const primaryGalleryImages = defaultGalleryImages.slice(0, 8);
const galleryOrientations = Array.isArray(visualSettings.galleryOrientations) ? visualSettings.galleryOrientations : [];
const videoOrientations = Array.isArray(visualSettings.videoOrientations) ? visualSettings.videoOrientations : [];
const galleryImages = hasCustomGallery
  ? tenantSite.gallery_urls.slice(0, 8).map((url) => safeAssetUrl(url)).filter(Boolean)
  : isPrimaryTenant ? primaryGalleryImages.slice(0, 8) : [];
const hasCustomVideos = Array.isArray(tenantSite.video_urls) && tenantSite.video_urls.length > 0;
const primaryDefaultVideos = [...defaultVideos, { src: "videos/prife-brasil-palco-internacional.mp4", poster: "videos/prife-brasil-palco-internacional-poster.webp", orientation: "horizontal" }];
const videos = hasCustomVideos
  ? tenantSite.video_urls.slice(0, 4).map((url, index) => ({ src: safeAssetUrl(url), poster: "", orientation: ["horizontal", "vertical"].includes(videoOrientations[index]) ? videoOrientations[index] : "adaptive" })).filter((video) => video.src)
  : isPrimaryTenant ? primaryDefaultVideos.slice(0, 4) : [];
const publicEmail = String(tenantSite.public_email || "").trim();
const googleReviewUrl = safeAssetUrl(integrationConfig.googleReviewUrl);
const leaderRole = tenantSite.leader_role || "LÍDER DE EXPANSÃO";
const leaderHeading = tenantSite.leader_heading || "Conhecimento, direção e uma visão de futuro.";
const leaderDescription = tenantSite.description || `Conheça o ecossistema Prife com ${ownerName}.`;
const leaderQuote = tenantSite.leader_quote || "Mais do que conhecer produtos, é compreender uma nova forma de conectar bem-estar, inovação e oportunidade.";
const leaderImage = safeAssetUrl(tenantSite.leader_image_url, isPrimaryTenant ? "/brand/williams-costa-leite.webp" : "/brand/prife-brasil-original.png");

function personalized(value) {
  return String(value || "").replaceAll("Williams Costa Leite", ownerName).replaceAll("Williams", ownerFirstName);
}

function renderHeroDescription(hero) {
  const lines = Array.isArray(hero.descriptionLines) && hero.descriptionLines.length
    ? hero.descriptionLines
    : [[hero.description, "", ""]];

  return lines.map(([before, emphasis, after], index) => {
    const accent = emphasis
      ? `<strong class="hero-intro-accent">${escapeHtml(emphasis)}</strong>`
      : "";
    const finalClass = index === lines.length - 1 ? " hero-intro-line-final" : "";
    return `<span class="hero-intro-line${finalClass}">${escapeHtml(before)}${accent}${escapeHtml(after)}</span>`;
  }).join("");
}

function applyVisualSettings() {
  const colors = visualSettings.colors && typeof visualSettings.colors === "object" ? visualSettings.colors : {};
  const validColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
  const root = document.documentElement;
  root.style.setProperty("--cyan", validColor(colors.accent, "#12dff3"));
  root.style.setProperty("--tenant-accent-secondary", validColor(colors.accentSecondary, "#49f3c6"));
  root.style.setProperty("--tenant-background", validColor(colors.background, "#03071c"));
  root.style.setProperty("--tenant-surface", validColor(colors.surface, "#071a43"));
  root.style.setProperty("--white", validColor(colors.text, "#f7fbff"));
  root.style.setProperty("--tenant-font-scale", `${Math.min(125, Math.max(85, Number(visualSettings.fontScale) || 100))}%`);
  root.style.setProperty("--tenant-content-width", `${Math.min(1480, Math.max(980, Number(visualSettings.contentWidth) || 1180))}px`);
  root.style.setProperty("--tenant-radius", `${Math.min(40, Math.max(0, Number(visualSettings.radius) || 22))}px`);
  document.body.dataset.tenantFont = ["manrope", "geist", "system"].includes(visualSettings.fontFamily) ? visualSettings.fontFamily : "manrope";
  document.body.dataset.tenantButtons = ["pill", "rounded", "square"].includes(visualSettings.buttonStyle) ? visualSettings.buttonStyle : "pill";
  document.body.dataset.tenantCards = ["glass", "solid", "outline"].includes(visualSettings.cardStyle) ? visualSettings.cardStyle : "glass";
  document.body.dataset.tenantMotion = ["off", "subtle", "full"].includes(visualSettings.motion) ? visualSettings.motion : "full";
  document.body.dataset.siteScope = isPrimaryTenant ? "primary" : "subdomain";

  const main = document.querySelector("main");
  if (!main) return;
  const sectionMap = {
    hero: main.querySelector(".hero"), about: main.querySelector(".about-preview"), global: main.querySelector(".global-section"),
    products: main.querySelector(".products-section"), gallery: main.querySelector(".gallery-section"), leader: main.querySelector(".williams-section"),
    journey: main.querySelector(".journey-section"), faq: main.querySelector(".faq-section"), contact: main.querySelector(".contact-section"),
  };
  const order = Array.isArray(visualSettings.sections) ? visualSettings.sections : Object.keys(sectionMap);
  const hidden = new Set(Array.isArray(visualSettings.hiddenSections) ? visualSettings.hiddenSections : []);
  order.forEach((key) => { const section = sectionMap[key]; if (section) { section.hidden = hidden.has(key); main.append(section); } });
  const texts = visualTexts;
  const setText = (selector, value) => { const node = document.querySelector(selector); if (node && String(value || "").trim()) node.textContent = String(value).trim(); };
  setText(".hero h1", texts.heroTitle); setText(".hero-copy > p", texts.heroDescription);
  setText(".about-copy h2", texts.aboutTitle);
  setText(".products-heading h2", texts.productsTitle); setText(".gallery-heading h2", texts.galleryTitle);
  setText(".contact-inner h2", texts.contactTitle); setText("#contact-whatsapp strong", texts.contactButton);
}

function videoEmbedUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    if (url.hostname === "youtu.be") return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {}
  return null;
}

const savedLanguage = localStorage.getItem("prife-language");
let language = languages.some((item) => item.code === savedLanguage)
  ? savedLanguage
  : "pt";
let materialLanguage = language;
let productIndex = 0;
let productTimer;
let contactIntentIndex = 0;
let quizCompletionTracked = false;
let adminAccessState;

const attributionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
];

function getAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const current = Object.fromEntries(
      attributionKeys
        .map((key) => [key, params.get(key)])
        .filter(([, value]) => Boolean(value))
    );
    const stored = JSON.parse(sessionStorage.getItem("prife-attribution") || "{}");
    const attribution = Object.keys(current).length ? { ...stored, ...current } : stored;

    if (Object.keys(attribution).length) {
      sessionStorage.setItem("prife-attribution", JSON.stringify(attribution));
    }

    return attribution;
  } catch {
    return {};
  }
}

function trackEvent(eventName, details = {}) {
  const payload = {
    event: eventName,
    language,
    page_path: window.location.pathname,
    page_title: document.title,
    ...getAttribution(),
    ...details,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  window.dispatchEvent(new CustomEvent("prife:analytics", { detail: payload }));
}

window.prifeTrack = trackEvent;

// The experience is intentionally animated by default on every supported device.
const reducedMotion = () => false;

function icon(name) {
  const paths = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevron: '<path d="M8 10l4 4 4-4"/>',
    download: '<path d="M12 3v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.75 3.05 2.75 13.95 0 17M12 3.5c-2.75 3.05-2.75 13.95 0 17M5.7 7.2h12.6M5.7 16.8h12.6"/>',
    login: '<path d="M14 8l4 4-4 4M18 12H8"/><path d="M11 5H5v14h6"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    folder: '<path d="M3 7.5h7l2-2h9v13H3v-11Z"/><path d="M3 9.5h18"/>',
    check: '<path d="m6.5 12.5 3.3 3.3 7.7-8"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>',
    map: '<path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/>',
    sparkle: '<path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>',
    shield: '<path d="M12 3 5.5 6v5.2c0 4.1 2.6 7.8 6.5 9.8 3.9-2 6.5-5.7 6.5-9.8V6L12 3Z"/><path d="m9.2 12.2 1.8 1.8 3.8-4"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  };

  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.arrow}</svg>`;
}

function socialIcon(kind, mini = false) {
  const classes = {
    whatsapp: "whatsapp-icon",
    instagram: "instagram-icon",
    youtube: "youtube-icon",
  };
  const paths = {
    whatsapp:
      '<path d="M20.8 11.9a8.8 8.8 0 0 1-13 7.7L3 21l1.4-4.7a8.8 8.8 0 1 1 16.4-4.4Z"/><path d="M8.2 7.4c.2-.5.5-.6.9-.6h.6c.3 0 .5.1.6.5l.9 2.1c.1.3.1.6-.1.8l-.8 1c.9 1.8 2.1 3 3.9 3.9l1-.8c.2-.2.5-.2.8-.1l2.1.9c.3.1.5.3.5.6v.6c0 .4-.1.7-.6.9-.6.3-1.5.5-2.4.3-1.5-.3-3.4-1.2-5.3-3.1-1.9-1.9-2.8-3.8-3.1-5.3-.2-.9 0-1.8.3-2.4Z"/>',
    instagram:
      '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="social-dot"/>',
    youtube:
      '<path d="M21 8.1c-.2-1.4-1.1-2.4-2.5-2.6C16.5 5.2 14.3 5 12 5s-4.5.2-6.5.5C4.1 5.7 3.2 6.7 3 8.1A25 25 0 0 0 2.8 12c0 1.3.1 2.6.2 3.9.2 1.4 1.1 2.4 2.5 2.6 2 .3 4.2.5 6.5.5s4.5-.2 6.5-.5c1.4-.2 2.3-1.2 2.5-2.6.2-1.3.2-2.6.2-3.9s0-2.6-.2-3.9Z"/><path d="m10 9 5 3-5 3V9Z" class="youtube-play"/>',
  };
  return `<span class="social-icon-3d ${classes[kind]}${mini ? " social-icon-mini" : ""}"><svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind]}</svg></span>`;
}

function thoughtIcon() {
  return `<span class="thought-icon-3d"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14.4 32.8c-5.1 0-9.2-3.7-9.2-8.4 0-4.2 3.2-7.6 7.5-8.3C14.6 10.8 19.1 7.4 24.6 7.4c6 0 10.9 4 12.2 9.5 3.8 1 6.5 4.2 6.5 8 0 4.6-4 8-9 8H14.4Z"/><circle cx="15.8" cy="38.1" r="3.2"/><circle cx="10.2" cy="43" r="1.9"/><circle class="thought-dot" cx="19" cy="23" r="2.2"/><circle class="thought-dot" cx="25" cy="23" r="2.2"/><circle class="thought-dot" cx="31" cy="23" r="2.2"/></svg></span>`;
}

function scrollToSection(id) {
  trackEvent("section_navigation", { section: id });
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
  document.querySelector("#main-menu")?.classList.remove("open");
  document.querySelector("#menu-toggle")?.setAttribute("aria-expanded", "false");
}

function whatsappUrl(message = copy[language].whatsappMessage) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(personalized(message))}`;
}

function languageOptionsMarkup() {
  return languages
    .map(
      (item) => `
        <button
          class="language-option ${language === item.code ? "active" : ""}"
          type="button"
          role="option"
          aria-selected="${language === item.code}"
          data-language="${item.code}"
        >
          <span class="language-flag flag-${item.code}"><i></i></span>
          <span class="language-option-copy"><strong>${item.label}</strong><small>${item.short}</small></span>
          <span class="language-check">${language === item.code ? icon("check") : ""}</span>
        </button>`
    )
    .join("");
}

function materialsMarkup() {
  const t = copy[language];
  const supportDocuments = [
    { id: "apresentacao-prife", title: { pt: "Apresentação completa Prife", es: "Presentación completa Prife", en: "Complete Prife presentation" }, links: { pt: "pdfs/apoio-01-apresentacao-prife.pdf", es: "pdfs/apresentacion-completa-prife-es.pdf", en: null } },
    { id: "iteracare-inmetro", title: { pt: "Certificação iTeraCare Inmetro", es: "Certificación iTeraCare Inmetro", en: "iTeraCare Inmetro certification" }, links: { pt: "pdfs/apoio-02-iteracare-inmetro.pdf", es: null, en: null } },
    { id: "iteracare-autenticidade", title: { pt: "Guia de autenticidade iTeraCare", es: "Guía de autenticidad iTeraCare", en: "iTeraCare authenticity guide" }, links: { pt: "pdfs/apoio-03-iteracare-autenticidade.pdf", es: null, en: null } },
    { id: "pontos-aplicacao", title: { pt: "Pontos de aplicação", es: "Puntos de aplicación", en: "Application points" }, links: { pt: "pdfs/apoio-04-pontos-aplicacao.pdf", es: null, en: null } },
    { id: "guia-aplicacao", title: { pt: "Guia completo de aplicação", es: "Guía completa de aplicación", en: "Complete application guide" }, links: { pt: "pdfs/apoio-05-guia-aplicacao.pdf", es: null, en: null } },
    { id: "certificados-iteracare", title: { pt: "Certificados iTeraCare", es: "Certificados iTeraCare", en: "iTeraCare certificates" }, links: { pt: "pdfs/apoio-06-certificados-iteracare.pdf", es: null, en: null } },
    { id: "revista-prife", title: { pt: "Revista Prife", es: "Revista Prife", en: "Prife Magazine" }, links: { pt: "pdfs/apoio-07-revista-prife.pdf", es: null, en: null } },
  ];

  return supportDocuments
    .map((document, position) => {
      const link = document.links[materialLanguage];
      const title = document.title[language] || document.title.pt;

      if (!link) {
        return `
          <div class="disabled" aria-disabled="true">
            <span>${String(position + 1).padStart(2, "0")}</span>
            <b>${title}<small>${t.productHeading.soon}</small></b>
            ${icon("download")}
          </div>`;
      }

      return `
        <a class="material-item" href="${link}" download data-track="material_download" data-track-product="${document.id}" data-track-language="${materialLanguage}">
          <span>${String(position + 1).padStart(2, "0")}</span>
          <b>${title}</b>
          ${icon("download")}
        </a>`;
    })
    .join("");
}

function productTabsMarkup() {
  const t = copy[language];

  return products
    .map(
      (product, index) => `
        <button
          type="button"
          role="tab"
          aria-selected="${productIndex === index}"
          class="${productIndex === index ? "active" : ""}"
          data-product-index="${index}"
        >
          <span>${product.number}</span>
          <b>${t.productItems[index][1]}</b>
        </button>`
    )
    .join("");
}

function productCardMarkup() {
  const t = copy[language];
  const product = products[productIndex];
  const [eyebrow, title, description] = t.productItems[productIndex];

  const pdfOptions = languages
    .map((item) => {
      const link = product.pdfs[item.code];
      if (!link) {
        return `
          <span class="pdf-language-link disabled" aria-disabled="true">
            <b>${item.short}</b>
            <small>${item.label}<i>${t.productHeading.soon}</i></small>
          </span>`;
      }

      return `
        <a class="pdf-language-link" href="${link}" download aria-label="Baixar PDF: ${title} — ${item.label}" data-track="pdf_download" data-track-product="${product.id}" data-track-language="${item.code}">
          ${icon("download")}
          <b>${item.short}</b>
          <small>${item.label}</small>
        </a>`;
    })
    .join("");

  const images = product.images
    .map(
      (src, index) => `
        <img
          src="${src}"
          alt="${product.images.length > 1 ? `${title} — modelo ${index + 1}` : title}"
          loading="lazy"
          decoding="async"
        />`
    )
    .join("");

  return `
    <div class="product-light"></div>
    <div class="featured-copy">
      <span>${eyebrow}</span>
      <h3>${title}</h3>
      <p>${description}</p>
      <div class="pdf-language-block">
        <strong>${t.productHeading.download}</strong>
        <div class="pdf-language-options">${pdfOptions}</div>
        <small class="pdf-status pdf-ready">${t.productHeading.ready}</small>
      </div>
    </div>
    <div class="product-media ${product.className}">
      <div class="product-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="product-scanline" aria-hidden="true"></div>
      <div class="media-items">${images}</div>
    </div>
    <b class="featured-number">${product.number}</b>`;
}

function galleryMarkup() {
  const t = copy[language];

  return galleryImages
    .map((src, index) => {
      const fallbackItem = t.galleryItems[index] || [`Foto ${index + 1}`, "Experiência Prife"];
      const title = hasCustomGallery ? (tenantSite.gallery_titles?.[index] || `Foto ${index + 1}`) : fallbackItem[0];
      const description = hasCustomGallery ? (tenantSite.gallery_descriptions?.[index] || "Experiência Prife") : fallbackItem[1];
      const orientation = ["horizontal", "vertical"].includes(galleryOrientations[index]) ? galleryOrientations[index] : "";
      const ratioClass = orientation === "vertical" ? "is-portrait" : orientation === "horizontal" ? "is-landscape" : "media-ratio-pending";
      return `
        <figure class="${ratioClass}" ${orientation ? `data-fixed-orientation="${orientation}" style="--media-aspect:${orientation === "vertical" ? "3 / 4" : "16 / 10"}"` : ""}>
          <img data-src="${escapeHtml(publicAssetUrl(src))}" alt="${escapeHtml(title)}" decoding="async" fetchpriority="low" />
          <div class="gallery-shine"></div>
          <figcaption>
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${escapeHtml(title)}</strong>
              <small>${escapeHtml(description)}</small>
            </div>
          </figcaption>
        </figure>`;
    })
    .join("");
}

function videosMarkup() {
  const t = copy[language];

  const cards = videos
    .map((video, index) => {
      const fallbackItem = t.videoItems[index] || [`Vídeo ${index + 1}`, "História em movimento", "Assista à experiência Prife."];
      const title = hasCustomVideos ? (tenantSite.video_titles?.[index] || `Vídeo ${index + 1}`) : fallbackItem[0];
      const description = hasCustomVideos ? (tenantSite.video_descriptions?.[index] || "História em movimento") : fallbackItem[1];
      const hook = hasCustomVideos ? title : fallbackItem[2];
      const embedUrl = videoEmbedUrl(video.src);
      const initialAspect = video.orientation === "vertical" ? "9 / 16" : video.orientation === "horizontal" ? "16 / 9" : "16 / 9";
      const media = embedUrl
        ? `<iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(title)}" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
        : `<video controls preload="none" playsinline ${video.poster ? `poster="${escapeHtml(publicAssetUrl(video.poster))}"` : ""} aria-label="${escapeHtml(title)}"><source data-src="${escapeHtml(publicAssetUrl(video.src))}" />${t.gallery.unsupported}</video>`;
      return `
        <article class="video-card ${video.orientation} video-slot-${index + 1}" ${video.orientation !== "adaptive" ? `data-fixed-orientation="${video.orientation}"` : ""} style="--media-aspect:${initialAspect}">
          <div class="video-media">
            ${media}
            ${embedUrl ? "" : `<button class="video-hook" type="button" data-video-play aria-label="Assistir: ${escapeHtml(title)}">
              <span>${t.gallery.beforeWatch}</span>
              <strong>${escapeHtml(hook)}</strong>
              <b><i aria-hidden="true">▶</i> ${t.gallery.play}</b>
            </button>`}
          </div>
          <div class="video-caption">
            <small>VÍDEO ${String(index + 1).padStart(2, "0")}</small>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(description)}</span>
          </div>
        </article>`;
    });

  return `<div class="video-balanced-layout">${cards.join("")}</div>`;
}

function contactIntentsMarkup() {
  const t = copy[language];

  return t.contact.intents
    .map(
      ([title, description], index) => `
        <a
          class="contact-intent ${contactIntentIndex === index ? "active" : ""}"
          href="${whatsappUrl(t.contact.intents[index][2])}"
          target="_blank"
          rel="noopener noreferrer"
          data-contact-intent="${index}"
          data-track="whatsapp_click"
          data-track-location="contact_intent"
          data-track-intent="${["products", "opportunity", "support"][index]}"
        >
          <span>${String(index + 1).padStart(2, "0")}</span>
          <b>${title}<small>${description}</small></b>
          ${icon("arrow")}
        </a>`
    )
    .join("");
}

const quizQuestions = [
  {
    kicker: "OBSERVAR É O PRIMEIRO PASSO",
    title: "O que mais incomoda você atualmente?",
    options: [
      "Dores no corpo",
      "Cansaço ou falta de energia",
      "Ansiedade, tensão ou estresse",
      "Sono ruim ou não reparador",
      "Problemas digestivos",
      "Dor de cabeça",
      "Inchaço ou retenção",
      "Outro sinal",
    ],
  },
  {
    kicker: "SEGURANÇA EM PRIMEIRO LUGAR",
    title: "Como esse sinal se apresenta?",
    options: ["Intenso, súbito, está piorando ou causa preocupação", "Persistente e frequente", "Algumas vezes, sem intensidade", "De vez em quando"],
  },
  {
    kicker: "ENERGIA E DISPOSIÇÃO",
    title: "Como está sua energia ao longo do dia?",
    options: ["Estável e boa", "Cai no meio do dia", "Baixa desde cedo", "Oscila bastante"],
  },
  {
    kicker: "QUALIDADE DO DESCANSO",
    title: "Como você avalia seu sono?",
    options: ["Durmo e acordo bem", "Demoro para dormir", "Acordo durante a noite", "Acordo cansado(a)"],
  },
  {
    kicker: "CORPO EM MOVIMENTO",
    title: "Como o corpo reage à sua rotina?",
    options: ["Sinto leveza", "Percebo rigidez", "Sinto desconforto após esforço", "Tenho pouca disposição"],
  },
  {
    kicker: "CUIDADO E CONTINUIDADE",
    title: "Você já procura cuidar do seu bem-estar?",
    options: ["Sim, diariamente", "Algumas vezes na semana", "Estou começando agora", "Ainda não tenho uma rotina"],
  },
  {
    kicker: "SEU PRÓXIMO PASSO",
    title: "O que você deseja compreender melhor?",
    options: ["Mais energia na rotina", "Relaxamento e descanso", "Conforto e mobilidade", "Tecnologias de bem-estar Prife"],
  },
];

let quizStep = -1;
let quizAnswers = [];

function quizNeedsProfessionalGuidance() {
  const safetyAnswer = quizAnswers[1] || "";
  return safetyAnswer.startsWith("Intenso") || safetyAnswer.startsWith("Persistente");
}

function quizIntroMarkup() {
  return `
    <div class="quiz-pane quiz-intro">
      <span class="quiz-seal">${thoughtIcon()}</span>
      <small>MEDICINA TRADICIONAL CHINESA</small>
      <h2 id="quiz-title">Seu corpo está tentando lhe dizer alguma coisa?</h2>
      <h3>Responda algumas perguntas rápidas e observe os sinais da sua rotina.</h3>
      <p>Dor, cansaço, tensão e sono ruim podem ser formas de o corpo pedir mais atenção e equilíbrio.</p>
      <div class="quiz-meta"><span>7 perguntas</span><span>Resultado imediato</span><span>Conteúdo educativo</span></div>
      <button class="quiz-primary" type="button" data-quiz-start>QUERO ENTENDER MEUS SINAIS</button>
      <b>Quiz educativo • poucos passos • resultado imediato</b>
      <button class="quiz-later" type="button" data-quiz-close>Agora não</button>
    </div>`;
}

function quizQuestionMarkup() {
  const question = quizQuestions[quizStep];
  const selected = quizAnswers[quizStep];
  const progress = ((quizStep + 1) / quizQuestions.length) * 100;

  return `
    <div class="quiz-pane">
      <div class="quiz-progress">
        <span>Pergunta ${quizStep + 1} / ${quizQuestions.length}</span>
        <i><b style="width:${progress}%"></b></i>
      </div>
      <small class="quiz-kicker">${question.kicker}</small>
      <h2 id="quiz-title">${question.title}</h2>
      <div class="quiz-options">
        ${question.options.map((option, index) => `<button class="${selected === option ? "selected" : ""}" type="button" data-quiz-choice="${index}"><span>${String.fromCharCode(65 + index)}</span>${option}</button>`).join("")}
      </div>
      <div class="quiz-nav">
        <button type="button" data-quiz-back ${quizStep === 0 ? "disabled" : ""}>Voltar</button>
        <button class="quiz-primary" type="button" data-quiz-next ${selected ? "" : "disabled"}>${quizStep === quizQuestions.length - 1 ? "VER MEU RESULTADO" : "CONTINUAR"}</button>
      </div>
      <small class="quiz-note">Suas respostas ficam somente neste dispositivo e não são enviadas a terceiros.</small>
    </div>`;
}

function quizResultMarkup() {
  if (quizNeedsProfessionalGuidance()) {
    return `
      <div class="quiz-pane quiz-emergency">
        <span class="quiz-alert" aria-hidden="true">!</span>
        <small class="quiz-kicker">PRIORIZE SUA SEGURANÇA</small>
        <h2 id="quiz-title">Este sinal merece avaliação profissional.</h2>
        <p>Este quiz é apenas educativo e não realiza diagnóstico. Como você informou um sinal intenso, súbito, persistente, em piora ou preocupante, procure orientação de um profissional de saúde.</p>
        <strong>Se houver risco imediato, piora rápida ou mal-estar importante, busque o serviço de atendimento adequado da sua região.</strong>
        <div class="quiz-safe-actions">
          <button class="quiz-primary" type="button" data-quiz-understood>ENTENDI</button>
          <button class="quiz-secondary" type="button" data-quiz-site>VOLTAR AO SITE</button>
        </div>
        <small class="quiz-disclaimer">Você não será redirecionado automaticamente e nenhuma resposta será armazenada ou enviada.</small>
      </div>`;
  }

  const focus = quizAnswers.at(-1) || "mais equilíbrio na rotina";
  return `
    <div class="quiz-pane quiz-result">
      <div class="quiz-result-header">
        <span class="quiz-result-tag">LEITURA EDUCATIVA CONCLUÍDA</span>
        <h2 id="quiz-title">Seu momento pede atenção consciente.</h2>
        <em>O corpo se comunica por padrões, não por um único sinal.</em>
      </div>
      <p class="result-intro">Pelas respostas, seu principal interesse agora está relacionado a <strong>${focus.toLowerCase()}</strong>. Observar frequência, intensidade e contexto ajuda a compreender melhor a própria rotina.</p>
      <section>
        <h3>Três pontos para observar</h3>
        <div class="quiz-points">
          <div class="quiz-point"><b>Regularidade</b><span>Perceba em quais horários ou situações os sinais aparecem.</span></div>
          <div class="quiz-point"><b>Recuperação</b><span>Observe como sono, pausas e hidratação influenciam sua disposição.</span></div>
          <div class="quiz-point"><b>Continuidade</b><span>Pequenos hábitos consistentes tornam a percepção do corpo mais clara.</span></div>
        </div>
      </section>
      <aside class="quiz-safety"><h3>Informação importante</h3><p>Este resultado é educativo e não realiza diagnóstico. Sintomas persistentes ou intensos devem ser avaliados por um profissional de saúde.</p></aside>
      <blockquote>“Escutar o corpo é transformar sinais em escolhas mais conscientes.”</blockquote>
      <div class="quiz-cta">
        <h3>Quer conhecer as tecnologias Prife?</h3>
        <p>Converse com Williams e receba uma apresentação individual.</p>
        <a class="quiz-whatsapp-button" href="${whatsappUrl(`Olá, Williams! Concluí o Quiz MTC e quero conhecer as tecnologias Prife. Meu foco é: ${focus}.`)}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_click" data-track-location="quiz">FALAR NO WHATSAPP</a>
        <button type="button" data-quiz-restart>REFAZER O QUIZ</button>
      </div>
      <small class="quiz-disclaimer">Conteúdo informativo. Tecnologias de bem-estar não substituem diagnóstico, prescrição ou acompanhamento profissional.</small>
    </div>`;
}

function renderQuiz() {
  const root = document.querySelector("#quiz-root");
  if (!root) return;
  root.innerHTML = `
    <div class="quiz-overlay" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <div class="quiz-modal">
        <button class="quiz-close" type="button" data-quiz-close aria-label="Fechar">×</button>
        <div class="quiz-decoration" aria-hidden="true"><i></i><i></i></div>
        ${quizStep < 0 ? quizIntroMarkup() : quizStep < quizQuestions.length ? quizQuestionMarkup() : quizResultMarkup()}
      </div>
    </div>`;
  bindQuizEvents();
}

function openQuiz() {
  quizStep = -1;
  quizAnswers = [];
  quizCompletionTracked = false;
  trackEvent("quiz_open");
  document.body.classList.add("quiz-open");
  renderQuiz();
}

function closeQuiz() {
  document.querySelector("#quiz-root")?.replaceChildren();
  document.body.classList.remove("quiz-open");
}

function bindQuizEvents() {
  const overlay = document.querySelector(".quiz-overlay");
  overlay?.addEventListener("click", (event) => {
    if (event.target === overlay) closeQuiz();
  });
  document.querySelectorAll("[data-quiz-close]").forEach((button) => button.addEventListener("click", closeQuiz));
  document.querySelector("[data-quiz-start]")?.addEventListener("click", () => {
    trackEvent("quiz_start");
    quizStep = 0;
    renderQuiz();
  });
  document.querySelectorAll("[data-quiz-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      quizAnswers[quizStep] = quizQuestions[quizStep].options[Number(button.dataset.quizChoice)];
      renderQuiz();
    });
  });
  document.querySelector("[data-quiz-back]")?.addEventListener("click", () => {
    if (quizStep > 0) quizStep -= 1;
    renderQuiz();
  });
  document.querySelector("[data-quiz-next]")?.addEventListener("click", () => {
    if (!quizAnswers[quizStep]) return;
    quizStep += 1;
    if (quizStep === quizQuestions.length && !quizCompletionTracked) {
      quizCompletionTracked = true;
      trackEvent("quiz_complete");
    }
    renderQuiz();
  });
  document.querySelector("[data-quiz-restart]")?.addEventListener("click", () => {
    quizStep = 0;
    quizAnswers = [];
    renderQuiz();
  });
  document.querySelector("[data-quiz-understood]")?.addEventListener("click", closeQuiz);
  document.querySelector("[data-quiz-site]")?.addEventListener("click", closeQuiz);
}

function render() {
  const app = document.querySelector("#app");
  if (!app) return;
  const t = copy[language];
  const faq = {
    line1: String(visualTexts.faqTitleLine1 || "").trim() || t.faq.line1,
    line2: String(visualTexts.faqTitleLine2 || "").trim() || t.faq.line2,
    text: String(visualTexts.faqDescription || "").trim() || t.faq.text,
    items: t.faq.items.map(([question, answer], index) => [
      String(visualTexts[`faqQuestion${index + 1}`] || "").trim() || question,
      String(visualTexts[`faqAnswer${index + 1}`] || "").trim() || answer,
    ]),
  };
  const currentLanguage = languages.find((item) => item.code === language);
  const contactLabels = {
    pt: { email: "E-mail", phone: "Telefone", address: "Endereço", privacy: "Política de Privacidade", review: "Avaliar no Google" },
    es: { email: "Correo", phone: "Teléfono", address: "Dirección", privacy: "Política de Privacidad", review: "Opinar en Google" },
    en: { email: "Email", phone: "Phone", address: "Address", privacy: "Privacy Policy", review: "Review on Google" },
  }[language] || { email: "E-mail", phone: "Telefone", address: "Endereço", privacy: "Política de Privacidade", review: "Avaliar no Google" };
  document.documentElement.lang = t.locale;
  const browserMetadata = {
    pt: {
      title: `${tenantSite.business_name || "Prife Brasil"} | Tecnologias de bem-estar e oportunidade`,
      description: `Conheça as tecnologias de bem-estar, os produtos e a oportunidade Prife apresentados por ${ownerName}.`,
    },
    es: {
      title: `${tenantSite.business_name || "Prife Brasil"} | Tecnologías de bienestar y oportunidad`,
      description: `Conozca las tecnologías de bienestar, los productos y la oportunidad Prife presentados por ${ownerName}.`,
    },
    en: {
      title: `${tenantSite.business_name || "Prife Brasil"} | Wellness technology and opportunity`,
      description: `Discover Prife wellness technologies, products and business opportunity presented by ${ownerName}.`,
    },
  }[language];
  document.title = browserMetadata.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", browserMetadata.description);
  const tutorialsCopy = {
    pt: { kicker: "CENTRAL DE APRENDIZADO", title: "Tutoriais em vídeo", description: "Selecione um tutorial para assistir diretamente no YouTube.", watch: "Assistir no YouTube", close: "Fechar tutoriais" },
    es: { kicker: "CENTRO DE APRENDIZAJE", title: "Tutoriales en video", description: "Selecciona un tutorial para verlo directamente en YouTube.", watch: "Ver en YouTube", close: "Cerrar tutoriales" },
    en: { kicker: "LEARNING CENTER", title: "Video tutorials", description: "Select a tutorial to watch it directly on YouTube.", watch: "Watch on YouTube", close: "Close tutorials" },
  }[language];
  const pwgCopy = {
    pt: {
      title: "Conheça nossas Prife Wellness Galleries",
      close: "Fechar unidades PWG",
      contacts: "Contatos da Prife Wellness Gallery",
      map: "Abrir no Google Maps",
      cacoalArea: "Centro • Cacoal, Rondônia • Brasil",
      jiParanaArea: "Bairro Aurélio Bernardi • Em frente ao Centro Universitário AFia",
      message: "Olá! Gostaria de saber mais sobre a Prife Wellness Gallery.",
    },
    es: {
      title: "Conoce nuestras Prife Wellness Galleries",
      close: "Cerrar unidades PWG",
      contacts: "Contactos de Prife Wellness Gallery",
      map: "Abrir en Google Maps",
      cacoalArea: "Centro • Cacoal, Rondônia • Brasil",
      jiParanaArea: "Barrio Aurélio Bernardi • Frente al Centro Universitario AFia",
      message: "¡Hola! Me gustaría saber más sobre Prife Wellness Gallery.",
    },
    en: {
      title: "Discover our Prife Wellness Galleries",
      close: "Close PWG locations",
      contacts: "Prife Wellness Gallery contacts",
      map: "Open in Google Maps",
      cacoalArea: "Downtown • Cacoal, Rondônia • Brazil",
      jiParanaArea: "Aurélio Bernardi district • Across from AFia University Center",
      message: "Hello! I would like to learn more about Prife Wellness Gallery.",
    },
  }[language];
  const tutorials = [
    { url: "https://youtube.com/shorts/jT6UeVWwaVk?si=VSzi34ueMxplZbRQ", title: { pt: "Como fazer pagamento via Pix na PRIFE", es: "Cómo pagar mediante Pix en PRIFE", en: "How to pay via Pix at PRIFE" } },
    { url: "https://youtube.com/shorts/jT6UeVWwaVk?si=Xn7TaQJ__X5sH_nq", title: { pt: "Como colocar saldo no Office PRIFE com cartão de crédito", es: "Cómo agregar saldo a Office PRIFE con tarjeta de crédito", en: "How to add funds to PRIFE Office by credit card" } },
    { url: "https://youtube.com/shorts/2yYg-v3Q924?si=Xonhm9rPkek7kgGV", title: { pt: "Como efetuar a manutenção PRIFE", es: "Cómo realizar el mantenimiento PRIFE", en: "How to perform PRIFE maintenance" } },
    { url: "https://youtube.com/shorts/bhlv5yASGdw?si=Wv10I7FpiK_hYn_G", title: { pt: "Como efetuar uma compra repetida", es: "Cómo realizar una compra repetida", en: "How to make a repeat purchase" } },
    { url: "https://youtube.com/shorts/TytdfsZ8_Qc?si=NVBZOsC04FKuP4t5", title: { pt: "Compra repetida e uso do bônus fidelidade", es: "Compra repetida y uso del bono de fidelidad", en: "Repeat purchase and loyalty bonus use" } },
    { url: "https://youtu.be/_MZmUUCMDuA", title: { pt: "iTeraCare — Como utilizar o dispositivo", es: "iTeraCare — Cómo utilizar el dispositivo", en: "iTeraCare — How to use the device" } },
  ];

  app.innerHTML = `
    <div class="progress" id="progress"></div>

    <header class="nav-shell">
      <nav class="nav wrap" aria-label="Navegação principal">
        <button class="brand" type="button" data-scroll="inicio" aria-label="Voltar ao início">
          <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" />
        </button>

        <button
          class="menu-toggle"
          id="menu-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="main-menu"
          aria-label="Abrir menu"
        ><span></span><span></span></button>

        <div class="nav-links" id="main-menu">
          <button type="button" data-scroll="sobre">${t.nav.about}</button>
          <button class="pwg-nav pwg-trigger" id="pwg-trigger" type="button" aria-haspopup="dialog" aria-controls="pwg-dialog">${t.nav.global}</button>
          <button type="button" data-scroll="produtos">${t.nav.technologies}</button>
          <button class="tutorials-trigger" type="button" aria-haspopup="dialog" aria-controls="tutorials-dialog">${t.nav.tutorials}</button>
          ${galleryImages.length ? `<button type="button" data-scroll="galeria">${t.nav.gallery}</button>` : ""}
          ${isPrimaryTenant
            ? `<a class="testimonials-nav" href="pdfs/depoimentos-prife.pdf" download data-track="testimonial_pdf_download" aria-label="Baixar PDF de depoimentos">${icon("star")} ${t.nav.testimonials} ${icon("download")}</a>`
            : videos.length ? `<button class="testimonials-nav" type="button" data-scroll="depoimentos">${icon("star")} ${t.nav.testimonials}</button>` : ""}

          <div class="materials-picker">
            <button class="materials-trigger" type="button" aria-expanded="false">
              ${icon("folder")} ${t.nav.materials} ${icon("chevron")}
            </button>
            <div class="materials-dropdown">
              <div class="materials-dropdown-head"><span>${t.productHeading.download}</span><small>PT · ES · EN</small></div>
              <div class="materials-language-tabs">
                ${languages
                  .map(
                    (item) => `
                      <button
                        type="button"
                        class="${materialLanguage === item.code ? "active" : ""}"
                        data-material-language="${item.code}"
                        aria-pressed="${materialLanguage === item.code}"
                      ><span class="language-flag flag-${item.code}"><i></i></span><b>${item.short}</b></button>`
                  )
                  .join("")}
              </div>
              <div class="materials-list" id="materials-list">${materialsMarkup()}</div>
            </div>
          </div>

          <div class="language-picker">
            <button class="language-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="${t.nav.language}: ${currentLanguage.label}">
              <span class="language-globe">${icon("globe")}</span>
              <span class="language-trigger-copy"><small>${t.nav.language}</small><strong>${currentLanguage.short}</strong></span>
              ${icon("chevron")}
            </button>
            <div class="language-dropdown" role="listbox" aria-label="${t.nav.language}">
              <div class="language-dropdown-head"><span>${t.nav.language}</span><small>PT · ES · EN</small></div>
              ${languageOptionsMarkup()}
            </div>
          </div>

          <a class="lead-finder-nav" href="/leads" data-track="lead_finder_open" aria-label="Prospector Exclusivo">
            <span class="lead-finder-icon">${icon("search")}</span>
            <span>Prospector <strong>EXCLUSIVO!</strong></span>
            <i class="exclusive-status" aria-hidden="true"></i>
          </a>

          <a class="lead-finder-nav meeting-room-nav" href="/reuniao" aria-label="Abrir sala de reunião ao vivo">
            <span class="lead-finder-icon">${icon("video")}</span>
            <span>Sala ao vivo <strong>REUNIÃO</strong></span>
            <i class="exclusive-status" aria-hidden="true"></i>
          </a>

          <a class="acupressure-nav" href="/ponto-vivo" aria-label="Abrir PontoVivo 3D — assistente de acupressão segura">
            <span class="acupressure-nav-icon">${icon("sparkle")}</span>
            <span>PontoVivo <strong>AGENTE 3D</strong></span>
          </a>

          <a class="admin-panel-nav" id="admin-panel-nav" href="/admin/empresas" aria-label="Abrir painel geral de empresas" data-track="admin_panel_open" ${isPrimaryTenant ? "" : "hidden"}>
            <span class="admin-panel-icon">${icon("shield")}</span>
            <span><small>GESTÃO EXCLUSIVA</small><strong>PAINEL GERAL</strong></span>
            <i aria-hidden="true"></i>
          </a>

          <a class="vip-login vip-login-primary" href="${siteConfig.vipUrl}" target="_blank" rel="noopener noreferrer" aria-label="Acessar Login Prife VIP" data-track="vip_login">
            <span class="vip-login-icon">${icon("login")}</span>
            <span><small>ÁREA DE MEMBROS</small><strong>LOGIN PRIFE VIP</strong></span>
            ${icon("arrow")}
          </a>
        </div>
      </nav>
    </header>

    <main>
      <section class="hero" id="inicio">
        <div class="hero-grid" aria-hidden="true"></div>
        <div class="orb orb-one" aria-hidden="true"></div>
        <div class="orb orb-two" aria-hidden="true"></div>
        <div class="light-streak streak-one" aria-hidden="true"></div>
        <div class="light-streak streak-two" aria-hidden="true"></div>
        <div class="energy-particles" aria-hidden="true">${"<i></i>".repeat(12)}</div>

        <div class="wrap hero-layout">
          <div class="hero-copy reveal-now">
            <div class="eyebrow"><span></span>${t.hero.eyebrow}</div>
            <h1>${t.hero.before}<em>${t.hero.emphasis}</em>${t.hero.after}</h1>
            <p class="hero-intro">${renderHeroDescription(t.hero)}</p>
            <a class="button hero-presentation-cta" href="/apresentacao" data-track="hero_presentation_open">
              ${t.hero.presentationButton} ${icon("arrow")}
            </a>
          </div>

          <div class="hero-visual reveal-now" aria-label="Vídeo do iTeraCare Classic Plus com seus componentes internos">
            <div class="halo halo-a"></div><div class="halo halo-b"></div>
            <div class="product-stage">
              <div class="energy-wave wave-a"></div><div class="energy-wave wave-b"></div>
              <div class="energy-scan"></div>
              <div class="stage-label"><span>${t.hero.highlight}</span><strong>iTeraCare<br />Classic Plus</strong></div>
              <div class="hero-video-shell"><video class="hero-product-video" autoplay muted loop playsinline preload="none" poster="/videos/iteracare-original-clean-top-v96-poster.webp" aria-label="Animação do iTeraCare Classic Plus desmontado"><source data-src="/videos/iteracare-original-clean-top-v96.webm" type="video/webm" /></video><video class="hero-product-video-mobile" autoplay muted loop playsinline preload="none" disablepictureinpicture poster="/videos/iteracare-mobile-ios-v102-poster.webp" aria-label="Animação do iTeraCare Classic Plus abrindo e fechando"><source data-src="/videos/iteracare-mobile-ios-v102.mp4" type="video/mp4" /></video><img class="hero-product-animation-mobile" src="/videos/iteracare-mobile-fluid-v100.webp" alt="Animação transparente do iTeraCare Classic Plus abrindo e fechando" decoding="async" fetchpriority="high" /><img class="hero-product-static" src="/products/current/iteracare-classic-plus.webp" alt="iTeraCare Classic Plus" decoding="async" fetchpriority="high" /><span class="hero-video-orbit" aria-hidden="true"></span></div>
              <div class="stage-chip"><i></i>${t.hero.wellbeing}</div>
            </div>
          </div>
        </div>

        <button class="scroll-cue" type="button" data-scroll="sobre" aria-label="Rolar para conhecer a Prife"><span>${t.hero.discover}</span><i></i></button>
      </section>

      <section class="about-preview" id="sobre">
        <div class="wrap about-grid reveal">
          <div class="about-image">
            <img src="brand/sede-prife-malaysia.webp" alt="Sede da Prife International em Kuala Lumpur, Malásia" loading="lazy" decoding="async" />
            <div class="image-badge headquarters-badge">
              ${icon("globe")}
              <div class="headquarters-copy">
                <small>${t.about.headquarters}</small>
                <strong>${t.about.company}</strong>
                <b>${t.about.city}</b>
                <address><span>${t.about.address1}</span><span>${t.about.address2}</span></address>
              </div>
            </div>
          </div>
          <div class="about-copy">
            <div class="section-kicker">PRIFE INTERNATIONAL</div>
            <h2>${t.about.before}<em>${t.about.emphasis}</em></h2>
            <p>${t.about.text}</p>
            <div class="metrics">
              ${t.about.metrics.map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="global-section" id="pwg">
        <img class="global-bg" src="brand/presenca-global-v77.webp" alt="Mapa representando a presença internacional da Prife" loading="lazy" decoding="async" />
        <div class="global-overlay"></div>
        <div class="global-radar" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="global-scan" aria-hidden="true"></div>
        <div class="wrap global-copy reveal">
          <div class="section-kicker">${t.global.kicker}</div>
          <h2>${t.global.line1}<br /><em>${t.global.line2}</em></h2>
          <p>${t.global.text}</p>
          <p class="global-support">${t.global.support}</p>
          <div class="global-pills">${t.global.pills.map((pill) => `<span>${pill}</span>`).join("")}</div>
          <button class="button primary global-cta" type="button" data-scroll="contato">${t.global.cta} ${icon("arrow")}</button>
        </div>
      </section>

      <section class="products-section" id="produtos">
        <div class="wrap products-heading reveal">
          <div><div class="section-kicker">${t.productHeading.kicker}</div><h2>${t.productHeading.before}<em>${t.productHeading.emphasis}</em></h2></div>
          <p>${t.productHeading.text}</p>
        </div>
        <div class="wrap product-showcase reveal" id="product-showcase">
          <div class="product-selector" id="product-selector" role="tablist">${productTabsMarkup()}</div>
          <article class="featured-product" id="featured-product">${productCardMarkup()}</article>
        </div>
      </section>

      ${galleryImages.length || videos.length ? `<section class="gallery-section" id="galeria">
        <div class="wrap gallery-heading reveal">
          <div><div class="section-kicker">${t.gallery.kicker}</div><h2>${t.gallery.before}<em>${t.gallery.emphasis}</em></h2></div>
          <p>${t.gallery.text}</p>
        </div>
        ${galleryImages.length ? `<div class="wrap photo-gallery reveal">${galleryMarkup()}</div>` : ""}
        ${videos.length ? `<div class="wrap video-gallery reveal" id="depoimentos">
          <div class="video-intro"><span>${t.gallery.videos}</span><h3>${t.gallery.videoTitle}</h3><p>${t.gallery.videoText}</p></div>
          ${videosMarkup()}
        </div>` : ""}
      </section>` : ""}

      <section class="williams-section" id="williams">
        <div class="portrait-glow"></div>
        <div class="williams-beam" aria-hidden="true"></div>
        <div class="wrap williams-grid reveal">
          <div class="portrait-card">
            <div class="portrait-lines"></div>
            <img src="${escapeHtml(leaderImage)}" alt="${escapeHtml(ownerName)}, ${escapeHtml(leaderRole)} da Prife Brasil" loading="lazy" decoding="async" />
            <div class="name-plate"><span>${escapeHtml(leaderRole)}</span><strong>${escapeHtml(ownerName).replace(/\s+(?=[^\s]+$)/, "<br />")}</strong></div>
          </div>
          <div class="williams-copy">
            <div class="section-kicker">${t.leader.kicker}</div>
            <h2>${escapeHtml(leaderHeading)}</h2>
            <p>${escapeHtml(leaderDescription)}</p>
            <blockquote>“${escapeHtml(leaderQuote).replace(/^“|”$/g, "")}”</blockquote>
            <button class="button primary" type="button" data-scroll="contato">${t.leader.button} ${icon("arrow")}</button>
          </div>
        </div>
      </section>

      <section class="journey-section travel-club-section" aria-label="Prife Travel Club — 5 benefícios em uma assinatura">
        <div class="wrap travel-club-promo reveal">
          <div class="travel-club-scene">
            <video class="travel-club-art" muted loop playsinline preload="none" disablepictureinpicture poster="travel/prife-travel-club-enhanced-v84-poster.webp" aria-label="Prife Travel Club — 5 benefícios em uma assinatura"><source data-src="travel/prife-travel-club-original-v87.mp4" type="video/mp4" /></video>
          </div>
        </div>
      </section>

      <section class="faq-section">
        <div class="wrap faq-grid reveal">
          <div class="faq-intro">
            <div class="section-kicker">${t.faq.kicker}</div>
            <h2>${escapeHtml(faq.line1)}<br /><em>${escapeHtml(faq.line2)}</em></h2>
            <p>${escapeHtml(faq.text)}</p>
            <a class="zoom-access-card" href="${zoomMeetingUrl}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t.faq.zoom.action)} — ${escapeHtml(t.faq.zoom.title)}">
              <span class="zoom-access-copy">
                <small>${escapeHtml(t.faq.zoom.eyebrow)}</small>
                <strong>${escapeHtml(t.faq.zoom.title)}</strong>
                <span>${escapeHtml(t.faq.zoom.text)}</span>
                <b>${escapeHtml(t.faq.zoom.action)} ${icon("arrow")}</b>
                <code>${zoomMeetingUrl}</code>
              </span>
              <span class="zoom-access-qr"><img src="brand/zoom-prife-qr.svg" alt="${escapeHtml(t.faq.zoom.qrAlt)}" /></span>
            </a>
          </div>
          <div class="faq-list">
            ${faq.items.map(([question, answer], index) => `<div class="faq-item ${index === 0 ? "open" : ""}"><button type="button" aria-expanded="${index === 0}" data-faq><span>${escapeHtml(question)}</span>${icon("chevron")}</button><div class="faq-answer"><p>${escapeHtml(answer)}</p></div></div>`).join("")}
          </div>
        </div>
      </section>

      <section class="contact-section" id="contato">
        <div class="contact-brand-stage" aria-hidden="true">
          <div class="contact-emblem contact-emblem-left">
            <span class="contact-emblem-ring ring-one"></span>
            <span class="contact-emblem-ring ring-two"></span>
            <img src="/brand/prife-symbol-motion.png" alt="" />
          </div>
          <div class="contact-emblem contact-emblem-right">
            <span class="contact-emblem-ring ring-one"></span>
            <span class="contact-emblem-ring ring-two"></span>
            <img src="/brand/prife-symbol-motion.png" alt="" />
          </div>
          <div class="contact-emblem contact-emblem-lower">
            <span class="contact-emblem-ring ring-one"></span>
            <span class="contact-emblem-ring ring-two"></span>
            <img src="/brand/prife-symbol-motion.png" alt="" />
          </div>
          <div class="contact-light-points">
            <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
        </div>
        <div class="wrap contact-inner reveal">
          <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" />
          <div class="section-kicker">${t.contact.kicker}</div>
          <h2>${t.contact.before}<em>${t.contact.emphasis}</em></h2>
          <div class="contact-intent-block">
            <div class="contact-intents" role="group" aria-label="${t.contact.intentLabel}">${contactIntentsMarkup()}</div>
          </div>
          <div class="contact-actions contact-secondary">
            <a class="social-button whatsapp-button" id="contact-whatsapp" href="${whatsappUrl(t.contact.intents[contactIntentIndex][2])}" target="_blank" rel="noopener noreferrer" aria-label="${t.contact.whatsapp}" data-track="whatsapp_click" data-track-location="contact" data-track-intent="products">${socialIcon("whatsapp")}<span class="social-copy">${t.contact.whatsapp}<strong id="contact-selected-intent">${t.contact.intents[contactIntentIndex][0]}</strong></span></a>
            ${siteConfig.instagramUrl ? `<a class="social-button instagram-button" href="${siteConfig.instagramUrl}" target="_blank" rel="noopener noreferrer" aria-label="Abrir Instagram ${escapeHtml(siteConfig.instagramHandle)}" data-track="social_click" data-track-network="instagram">${socialIcon("instagram")}<span class="social-copy">Instagram<strong>${escapeHtml(siteConfig.instagramHandle)}</strong></span></a>` : ""}
            ${siteConfig.youtubeUrl ? `<a class="social-button youtube-button" href="${siteConfig.youtubeUrl}" target="_blank" rel="noopener noreferrer" aria-label="Abrir canal YouTube ${escapeHtml(siteConfig.youtubeHandle)}" data-track="social_click" data-track-network="youtube">${socialIcon("youtube")}<span class="social-copy">YouTube<strong>${escapeHtml(siteConfig.youtubeHandle)}</strong></span></a>` : ""}
          </div>
        </div>
      </section>
    </main>

    <footer>
      <div class="wrap footer-grid">
        <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" />
        <p>${escapeHtml(leaderRole)}<br />${escapeHtml(ownerName)}${publicEmail ? `<br />${contactLabels.email}: <a href="mailto:${escapeHtml(publicEmail)}">${escapeHtml(publicEmail)}</a>` : ""}${siteConfig.whatsappNumber ? `<br />WhatsApp: <a href="${whatsappUrl()}">${escapeHtml(siteConfig.whatsappDisplay)}</a>` : ""}</p>
        <nav aria-label="Navegação do rodapé"><button type="button" data-scroll="sobre">${t.footer.company}</button><button type="button" data-scroll="produtos">${t.footer.products}</button><button type="button" data-scroll="galeria">${t.footer.gallery}</button><a href="/privacidade">${contactLabels.privacy}</a><a href="/leads" data-track="lead_finder_open">${t.nav.leads}</a>${googleReviewUrl ? `<a href="${escapeHtml(googleReviewUrl)}" target="_blank" rel="noopener noreferrer" data-track="google_review_open">${contactLabels.review}</a>` : ""}${siteConfig.instagramUrl ? `<a href="${siteConfig.instagramUrl}" target="_blank" rel="noopener noreferrer" data-track="social_click" data-track-network="instagram">${escapeHtml(siteConfig.instagramHandle)}</a>` : ""}</nav>
        <span class="footer-legal">${t.footer.rights.replace(/^©\s*\d{4}\s*•\s*/, "")}<i aria-hidden="true">•</i><a href="https://wa.me/595976945533" target="_blank" rel="noopener noreferrer" data-track="creative_credit_click">WR CREATIVE DIGITAL<sup>®</sup></a></span>
      </div>
    </footer>

    <dialog class="pwg-dialog" id="pwg-dialog" aria-labelledby="pwg-dialog-title">
      <div class="pwg-dialog-card pwg-locations-card">
        <button class="pwg-dialog-close" type="button" data-pwg-close aria-label="${pwgCopy.close}">×</button>
        <h2 class="sr-only" id="pwg-dialog-title">${pwgCopy.title}</h2>
        <div class="pwg-locations-grid">
          <article class="pwg-location-panel">
            <div class="pwg-dialog-media">
              <img src="/brand/prife-wellness-gallery-cacoal.webp" alt="Prife Wellness Gallery em Cacoal, Rondônia" loading="lazy" decoding="async" />
              <span>PRIFE WELLNESS GALLERY</span>
            </div>
            <div class="pwg-dialog-content">
              <div class="section-kicker">PWG • CACOAL, RONDÔNIA</div>
              <h3>Prife Wellness Gallery</h3>
              <address><strong>Rua Rio Branco, 1594</strong><span>${pwgCopy.cacoalArea}</span></address>
              <div class="pwg-whatsapp-contacts" aria-label="${pwgCopy.contacts}">
                <a href="https://wa.me/5565996465561?text=${encodeURIComponent(pwgCopy.message)}" target="_blank" rel="noopener noreferrer" data-track="pwg_whatsapp_open" data-contact="silvana-viana" aria-label="WhatsApp — Silvana Viana">
                  ${socialIcon("whatsapp")}<span><strong>Silvana Viana</strong><small>(65) 99646-5561</small></span>
                </a>
                <a href="https://wa.me/5569984535269?text=${encodeURIComponent(pwgCopy.message)}" target="_blank" rel="noopener noreferrer" data-track="pwg_whatsapp_open" data-contact="edio-lino" aria-label="WhatsApp — Edio Lino">
                  ${socialIcon("whatsapp")}<span><strong>Edio Lino</strong><small>(69) 98453-5269</small></span>
                </a>
              </div>
              <a class="button primary pwg-map-button" href="https://maps.app.goo.gl/u7PPwGAgTiidrg4g9?g_st=awb" target="_blank" rel="noopener noreferrer" data-track="pwg_maps_open">${pwgCopy.map} ${icon("arrow")}</a>
            </div>
          </article>

          <article class="pwg-location-panel">
            <div class="pwg-dialog-media">
              <img src="/brand/prife-wellness-gallery-ji-parana.webp" alt="Prife Wellness Gallery em Ji-Paraná, Rondônia" loading="lazy" decoding="async" />
              <span>PRIFE WELLNESS GALLERY</span>
            </div>
            <div class="pwg-dialog-content">
              <div class="section-kicker">PWG • JI-PARANÁ, RONDÔNIA</div>
              <h3>Prife Wellness Gallery</h3>
              <address><strong>Av. Engenheiro Manfredo Barata, 561</strong><span>${pwgCopy.jiParanaArea}</span></address>
              <div class="pwg-whatsapp-contacts pwg-whatsapp-single" aria-label="${pwgCopy.contacts}">
                <a href="https://wa.me/5569992129335?text=${encodeURIComponent(pwgCopy.message)}" target="_blank" rel="noopener noreferrer" data-track="pwg_whatsapp_open" data-contact="evaldo-arruda" aria-label="WhatsApp — Evaldo Arruda">
                  ${socialIcon("whatsapp")}<span><strong>Evaldo Arruda</strong><small>(69) 99212-9335</small></span>
                </a>
              </div>
              <a class="button primary pwg-map-button" href="https://maps.app.goo.gl/ATJg6w9HNLsPUm3e8" target="_blank" rel="noopener noreferrer" data-track="pwg_maps_open">${pwgCopy.map} ${icon("arrow")}</a>
            </div>
          </article>
        </div>
      </div>
    </dialog>

    <dialog class="pwg-dialog tutorials-dialog" id="tutorials-dialog" aria-labelledby="tutorials-dialog-title">
      <div class="pwg-dialog-card">
        <button class="pwg-dialog-close" type="button" data-tutorials-close aria-label="${tutorialsCopy.close}">×</button>
        <div class="tutorials-dialog-content">
          <div class="section-kicker">${tutorialsCopy.kicker}</div>
          <h2 id="tutorials-dialog-title">${tutorialsCopy.title}</h2>
          <p>${tutorialsCopy.description}</p>
          <div class="tutorials-list">
            ${tutorials.map((tutorial, index) => `<a href="${tutorial.url}" target="_blank" rel="noopener noreferrer" data-track="tutorial_open" data-tutorial="${index + 1}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${tutorial.title[language]}</strong><small>${tutorialsCopy.watch}</small>${icon("arrow")}</a>`).join("")}
          </div>
        </div>
      </div>
    </dialog>

    <button class="quiz-launcher" id="quiz-launch" type="button" aria-label="Quiz MTC">${thoughtIcon()}<b>Quiz MTC</b></button>
    <div id="quiz-root"></div>`;

  applyVisualSettings();
  bindContactMotion();
  bindEvents();
  setupGalleryImages();
  setupReveal();
  startProductRotation();
  updateScrollProgress();
  syncAdminNavigation();
}

function bindContactMotion() {
  const section = document.querySelector('#contato');
  if (section) section.dataset.contactMotion = document.body.dataset.tenantMotion === 'off' ? 'off' : 'on';
}

async function syncAdminNavigation() {
  const adminButton = document.querySelector("#admin-panel-nav");
  if (!adminButton) return;

  // O site principal também funciona como porta de entrada para a gestão.
  // A rota protegida encaminha visitantes sem sessão para o login.
  if (isPrimaryTenant) {
    adminButton.hidden = false;
    return;
  }

  try {
    if (typeof adminAccessState !== "boolean") {
      const response = await fetch("/api/auth/context", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = response.ok ? await response.json() : null;
      adminAccessState = data?.isAdmin === true;
    }
    adminButton.hidden = !adminAccessState;
  } catch {
    adminAccessState = false;
    adminButton.hidden = true;
  }
}

function updateProduct() {
  const selector = document.querySelector("#product-selector");
  const featured = document.querySelector("#featured-product");
  if (!selector || !featured) {
    clearInterval(productTimer);
    return;
  }
  selector.innerHTML = productTabsMarkup();
  featured.innerHTML = productCardMarkup();
  bindProductTabs();
}

function bindProductTabs() {
  document.querySelectorAll("[data-product-index]").forEach((button) => {
    button.addEventListener("click", () => {
      productIndex = Number(button.dataset.productIndex);
      trackEvent("product_select", { product: products[productIndex].id });
      updateProduct();
      startProductRotation();
    });
  });
}

function startProductRotation() {
  clearInterval(productTimer);
  if (!document.querySelector("#product-showcase") || reducedMotion()) return;
  productTimer = window.setInterval(() => {
    if (document.hidden || document.querySelector("#product-showcase:hover")) return;
    productIndex = (productIndex + 1) % products.length;
    updateProduct();
  }, 6000);
}

function setupReveal() {
  if (reducedMotion()) {
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("visible"));
    loadGalleryImages();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target.matches(".photo-gallery")) loadGalleryImages();
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

function setupGalleryImages() {
  if (!("IntersectionObserver" in window)) {
    loadGalleryImages();
    return;
  }
  const gallery = document.querySelector(".photo-gallery");
  if (!gallery) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      loadGalleryImages();
      observer.disconnect();
    }
  }, { rootMargin: "320px 0px" });
  observer.observe(gallery);
}

function loadGalleryImages() {
  document.querySelectorAll(".photo-gallery img[data-src]").forEach((image) => {
    if (!image.dataset.src) return;
    image.src = image.dataset.src;
    delete image.dataset.src;
  });
}

function bindVideoHooks() {
  document.querySelectorAll(".video-card").forEach((card, index) => {
    const video = card.querySelector("video");
    const trigger = card.querySelector("[data-video-play]");
    if (!video || !trigger) return;

    const activateVideoSource = () => {
      const source = video.querySelector("source[data-src]");
      if (source?.dataset.src && !source.src) {
        source.src = source.dataset.src;
        video.load();
      }
    };

    if (!video.hasAttribute("poster")) {
      video.preload = "metadata";
      video.addEventListener("loadedmetadata", () => {
        if (video.paused && video.currentTime === 0 && Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = Math.min(1, video.duration / 2);
        }
      }, { once: true });
      if ("IntersectionObserver" in window) {
        const previewObserver = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            activateVideoSource();
            previewObserver.disconnect();
          }
        }, { rootMargin: "200px 0px" });
        previewObserver.observe(card);
      } else {
        activateVideoSource();
      }
    }

    trigger.addEventListener("click", () => {
      activateVideoSource();
      card.classList.add("is-playing");
      video.play().catch(() => card.classList.remove("is-playing"));
    });
    video.addEventListener("play", () => {
      card.classList.add("is-playing");
      if (!video.dataset.playTracked) {
        video.dataset.playTracked = "true";
        trackEvent("video_start", { video: `video_${index + 1}` });
      }
    });
    video.addEventListener("ended", () => {
      card.classList.remove("is-playing");
      trackEvent("video_complete", { video: `video_${index + 1}` });
    });
  });
}

function scheduleHeroVideo() {
  const video = document.querySelector(".hero-product-video");
  const source = video?.querySelector("source[data-src]");
  if (!video || !source || reducedMotion() || getComputedStyle(video).display === "none") return;

  const activate = () => {
    if (source.src || !source.dataset.src) return;
    source.src = source.dataset.src;
    video.load();
    video.play().catch(() => {});
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(activate, { timeout: 900 });
  } else {
    window.setTimeout(activate, 500);
  }
}

function ensureHeroMobileVideoPlayback() {
  const video = document.querySelector(".hero-product-video-mobile");
  const shell = video?.closest(".hero-video-shell");
  if (!video || !shell) return;
  const source = video.querySelector("source[data-src]");

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;

  const showFallback = () => shell.classList.add("mobile-video-fallback");
  const play = () => {
    const playback = video.play();
    if (playback?.catch) playback.catch(() => {});
  };

  video.addEventListener("canplay", () => {
    shell.classList.remove("mobile-video-fallback");
    play();
  });
  video.addEventListener("error", showFallback);
  video.addEventListener("pause", () => {
    if (!document.hidden) window.setTimeout(play, 80);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) play();
  });

  const activate = () => {
    if (source?.dataset.src && !source.src) {
      source.src = source.dataset.src;
      video.load();
    }
    if (video.readyState >= 2) play();
  };
  if (getComputedStyle(video).display !== "none") activate();
}

function ensureTravelVideoPlayback() {
  const video = document.querySelector(".travel-club-art");
  if (!video) return;
  const source = video.querySelector("source[data-src]");

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;

  const play = () => video.play().catch(() => {});
  const activate = () => {
    if (source?.dataset.src && !source.src) {
      source.src = source.dataset.src;
      video.load();
    }
    if (video.readyState >= 2) play();
    else video.addEventListener("canplay", play, { once: true });
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        activate();
        observer.disconnect();
      }
    }, { rootMargin: "240px 0px" });
    observer.observe(video);
  } else {
    activate();
  }

  video.addEventListener("pause", () => {
    if (!document.hidden) window.setTimeout(play, 120);
  });
}

function mediaRatioClass(width, height) {
  if (!width || !height) return "is-landscape";
  const ratio = width / height;
  if (ratio < 0.82) return "is-portrait";
  if (ratio > 1.2) return "is-landscape";
  return "is-square";
}

function bindAdaptiveMediaRatios() {
  document.querySelectorAll(".photo-gallery figure").forEach((figure) => {
    if (figure.dataset.fixedOrientation) return;
    const image = figure.querySelector("img");
    if (!image) return;
    const applyRatio = () => {
      figure.classList.remove("media-ratio-pending", "is-portrait", "is-landscape", "is-square");
      figure.classList.add(mediaRatioClass(image.naturalWidth, image.naturalHeight));
      figure.style.setProperty("--media-aspect", `${image.naturalWidth} / ${image.naturalHeight}`);
    };
    if (image.complete && image.naturalWidth) applyRatio();
    else image.addEventListener("load", applyRatio, { once: true });
  });

  document.querySelectorAll(".video-card").forEach((card) => {
    if (card.dataset.fixedOrientation) return;
    const video = card.querySelector("video");
    if (!video) return;
    const applyRatio = () => {
      card.classList.remove("adaptive", "vertical", "horizontal", "is-portrait", "is-landscape", "is-square");
      card.classList.add(mediaRatioClass(video.videoWidth, video.videoHeight));
      card.style.setProperty("--media-aspect", `${video.videoWidth} / ${video.videoHeight}`);
    };
    if (video.readyState >= 1 && video.videoWidth) applyRatio();
    else video.addEventListener("loadedmetadata", applyRatio, { once: true });
  });
}

function bindContactIntents() {
  const t = copy[language];

  document.querySelectorAll("[data-contact-intent]").forEach((button) => {
    button.addEventListener("click", () => {
      contactIntentIndex = Number(button.dataset.contactIntent);
      trackEvent("contact_intent_select", {
        intent: ["products", "opportunity", "support"][contactIntentIndex] || "other",
      });
      document.querySelectorAll("[data-contact-intent]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
      });

      const whatsapp = document.querySelector("#contact-whatsapp");
      const selected = document.querySelector("#contact-selected-intent");
      if (whatsapp) whatsapp.href = whatsappUrl(t.contact.intents[contactIntentIndex][2]);
      if (whatsapp) whatsapp.dataset.trackIntent = ["products", "opportunity", "support"][contactIntentIndex];
      if (selected) selected.textContent = t.contact.intents[contactIntentIndex][0];
    });
  });
}

function updateScrollProgress() {
  const height = document.documentElement.scrollHeight - window.innerHeight;
  const percentage = height > 0 ? (window.scrollY / height) * 100 : 0;
  document.querySelector("#progress")?.style.setProperty("width", `${percentage}%`);
}

function closeDropdowns(except = null) {
  document.querySelectorAll(".materials-picker.open, .language-picker.open").forEach((dropdown) => {
    if (dropdown === except) return;
    dropdown.classList.remove("open");
    dropdown.querySelector(".materials-trigger, .language-trigger")?.setAttribute("aria-expanded", "false");
  });
}

function openPwgDialog() {
  const dialog = document.querySelector("#pwg-dialog");
  if (!dialog) return;
  document.querySelector("#main-menu")?.classList.remove("open");
  document.querySelector("#menu-toggle")?.setAttribute("aria-expanded", "false");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  trackEvent("pwg_window_open");
}

function closePwgDialog() {
  const dialog = document.querySelector("#pwg-dialog");
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
}

function openTutorialsDialog() {
  const dialog = document.querySelector("#tutorials-dialog");
  if (!dialog) return;
  document.querySelector("#main-menu")?.classList.remove("open");
  document.querySelector("#menu-toggle")?.setAttribute("aria-expanded", "false");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  trackEvent("tutorials_window_open");
}

function closeTutorialsDialog() {
  const dialog = document.querySelector("#tutorials-dialog");
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
}

function bindEvents() {
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.scroll === "galeria") loadGalleryImages();
      scrollToSection(button.dataset.scroll);
    });
  });

  const menuToggle = document.querySelector("#menu-toggle");
  menuToggle?.addEventListener("click", () => {
    const menu = document.querySelector("#main-menu");
    const open = menu.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll(".materials-trigger, .language-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const dropdown = trigger.closest(".materials-picker, .language-picker");
      const shouldOpen = !dropdown.classList.contains("open");
      closeDropdowns(dropdown);
      dropdown.classList.toggle("open", shouldOpen);
      trigger.setAttribute("aria-expanded", String(shouldOpen));
    });
  });

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      language = button.dataset.language;
      trackEvent("language_change", { selected_language: language });
      materialLanguage = language;
      localStorage.setItem("prife-language", language);
      render();
    });
  });

  document.querySelectorAll("[data-material-language]").forEach((button) => {
    button.addEventListener("click", () => {
      materialLanguage = button.dataset.materialLanguage;
      trackEvent("material_language_change", { selected_language: materialLanguage });
      document.querySelectorAll("[data-material-language]").forEach((item) => item.classList.toggle("active", item === button));
      const list = document.querySelector("#materials-list");
      if (list) list.innerHTML = materialsMarkup();
    });
  });

  document.querySelectorAll("[data-faq]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const willOpen = !item.classList.contains("open");
      document.querySelectorAll(".faq-item").forEach((other) => {
        other.classList.remove("open");
        other.querySelector("[data-faq]")?.setAttribute("aria-expanded", "false");
      });
      item.classList.toggle("open", willOpen);
      const open = item.classList.contains("open");
      button.setAttribute("aria-expanded", String(open));
    });
  });

  bindProductTabs();
  bindAdaptiveMediaRatios();
  bindVideoHooks();
  ensureTravelVideoPlayback();
  bindContactIntents();

  document.querySelector("#quiz-launch")?.addEventListener("click", openQuiz);
  document.querySelectorAll(".pwg-trigger").forEach((button) => button.addEventListener("click", openPwgDialog));
  document.querySelector("[data-pwg-close]")?.addEventListener("click", closePwgDialog);
  document.querySelector("#pwg-dialog")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closePwgDialog();
  });
  document.querySelectorAll(".tutorials-trigger").forEach((button) => button.addEventListener("click", openTutorialsDialog));
  document.querySelector("[data-tutorials-close]")?.addEventListener("click", closeTutorialsDialog);
  document.querySelector("#tutorials-dialog")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeTutorialsDialog();
  });

  document.onclick = (event) => {
    if (!event.target.closest(".materials-picker, .language-picker")) closeDropdowns();
  };
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeQuiz();
    closePwgDialog();
  }
});
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const target = event.target.closest("[data-track]");
  if (!target) return;

  const details = {};
  Object.entries(target.dataset).forEach(([key, value]) => {
    if (key === "track" || !value) return;
    details[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] = value;
  });
  trackEvent(target.dataset.track, details);
});
render();
document.querySelectorAll(".hero-actions, .seo-hero-actions").forEach((node) => node.remove());
scheduleHeroVideo();
ensureHeroMobileVideoPlayback();
trackEvent("site_ready");
