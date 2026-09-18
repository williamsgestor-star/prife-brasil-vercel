"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import SubscriptionPanel from "./SubscriptionPanel";
import { isSubscriptionInactive, subscriptionStatus } from "../lib/site-subscription";
import { createClient } from "../lib/supabase/client";
import { defaultVisualSettings, emptyTenantSiteProfile, type ManagedCompany, type TenantSiteProfile, type VisualSettings } from "./types";
import styles from "./Panel.module.css";

type ProfileKey = keyof TenantSiteProfile;

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(",");
const VIDEO_ACCEPT = Object.keys(VIDEO_TYPES).join(",");
const MAX_GALLERY_PHOTOS = 8;
const MAX_GALLERY_VIDEOS = 4;
const MAX_VIDEO_SIZE_MB = 50;
const SAVE_TIMEOUT_MS = 20_000;
const CREATE_COMPANY_TIMEOUT_MS = 20_000;
type MediaOrientation = "horizontal" | "vertical";
type CreatedAccess = { email: string; password: string; hostname: string };

const defaultFaqItems = [
  ["O que é a Prife?", "A Prife é uma empresa internacional com um ecossistema de produtos voltados ao bem-estar, tecnologia e estilo de vida."],
  ["Como conhecer os produtos?", "Você pode solicitar uma apresentação personalizada com Williams Costa Leite e entender as características de cada linha."],
  ["Existe oportunidade de negócio?", "Sim. A Prife também possui um modelo de empreendedorismo. Os detalhes, regras e condições devem ser apresentados de forma individual."],
  ["Os produtos substituem tratamento médico?", "Não. Tecnologias de bem-estar não substituem diagnóstico, prescrição ou acompanhamento de profissionais de saúde."],
  ["Como funciona o acompanhamento?", "Na apresentação individual, Williams explica as tecnologias, a oportunidade e os recursos de suporte e capacitação disponíveis para cada etapa."],
] as const;
const defaultFaqTitleLine1 = "Informação clara.";
const defaultFaqTitleLine2 = "Decisão consciente.";
const defaultFaqDescription = "As tecnologias apresentadas fazem parte do portfólio de bem-estar da Prife. Para orientações específicas, fale diretamente com o Líder de Expansão.";

function generateTemporaryPassword() {
  const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%"];
  const all = groups.join("");
  const randomIndex = (length: number) => {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % length;
  };
  const characters = groups.map((group) => group[randomIndex(group.length)]);
  while (characters.length < 14) characters.push(all[randomIndex(all.length)]);
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}

function uploadStorageObject({
  file,
  tenantId,
  kind,
  onProgress,
}: {
  file: File;
  tenantId: string;
  kind: "leader" | "gallery" | "videos";
  onProgress: (loaded: number) => void;
}) {
  return new Promise<{ path: string; publicUrl: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const query = new URLSearchParams({ tenantId, kind });
    let started = false;
    const startTimer = window.setTimeout(() => {
      if (started) return;
      request.abort();
      reject(new Error("O envio não conseguiu iniciar. Atualize a página e tente novamente."));
    }, 30_000);

    const finish = () => window.clearTimeout(startTimer);
    request.open("POST", `/api/media/upload?${query.toString()}`);
    request.timeout = 10 * 60_000;
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      started = true;
      finish();
      if (event.lengthComputable) onProgress(event.loaded);
    };
    request.onerror = () => {
      finish();
      reject(new Error("Falha de conexão durante o envio."));
    };
    request.onabort = () => finish();
    request.ontimeout = () => {
      finish();
      reject(new Error("O envio demorou além do limite. Verifique sua conexão e tente novamente."));
    };
    request.onload = () => {
      started = true;
      finish();
      let response: { path?: string; publicUrl?: string; error?: string } = {};
      try {
        response = JSON.parse(request.responseText) as typeof response;
      } catch {
        // A resposta inválida será tratada pela mensagem abaixo.
      }
      if (request.status < 200 || request.status >= 300 || !response.path || !response.publicUrl) {
        reject(new Error(response.error || `O servidor recusou o envio (${request.status || "sem resposta"}).`));
        return;
      }
      resolve({ path: response.path, publicUrl: response.publicUrl });
    };
    request.send(file);
  });
}

async function optimizeImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Não foi possível preparar a imagem para envio.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("Não foi possível comprimir a imagem.");
  const filename = `${file.name.replace(/\.[^.]+$/, "") || "imagem"}.webp`;
  return new File([blob], filename, { type: "image/webp", lastModified: Date.now() });
}

function readableUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (normalized.includes("row-level security") || normalized.includes("unauthorized") || normalized.includes("permission")) {
    return "Sua conta não tem autorização para enviar arquivos neste subdomínio. Entre novamente com a conta administradora.";
  }
  if (normalized.includes("payload too large") || normalized.includes("maximum allowed size") || normalized.includes("file size")) {
    return `O arquivo excede o limite permitido. Imagens de origem podem ter até 15 MB e vídeos até ${MAX_VIDEO_SIZE_MB} MB.`;
  }
  if (normalized.includes("mime") || normalized.includes("content type") || normalized.includes("invalid file")) {
    return "Formato não permitido. Envie imagens JPG, PNG ou WebP; e vídeos MP4, WebM ou MOV.";
  }
  if (normalized.includes("bucket") && normalized.includes("not found")) {
    return "O armazenamento de arquivos está indisponível. Atualize a página e tente novamente.";
  }
  if (normalized.includes("fetch") || normalized.includes("network") || normalized.includes("load failed")) {
    return "Falha de conexão durante o envio. Verifique sua internet e tente novamente.";
  }
  return message ? `Não foi possível enviar o arquivo: ${message}` : "Não foi possível enviar o arquivo. Tente novamente.";
}

export default function CompanyEditor({
  initialCompanies,
  adminMode,
}: {
  initialCompanies: ManagedCompany[];
  adminMode: boolean;
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [billingNow, setBillingNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setBillingNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [selectedId, setSelectedId] = useState(initialCompanies[0]?.tenantId ?? "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newTemporaryPassword, setNewTemporaryPassword] = useState("");
  const [createdAccess, setCreatedAccess] = useState<CreatedAccess | null>(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const selected = useMemo(() => companies.find((item) => item.tenantId === selectedId), [companies, selectedId]);

  function updateCompany(change: Partial<ManagedCompany>) {
    setCompanies((current) => current.map((item) => item.tenantId === selectedId ? { ...item, ...change } : item));
    setError(""); setSuccess("");
  }

  function updateProfile<K extends ProfileKey>(key: K, value: TenantSiteProfile[K]) {
    if (!selected) return;
    updateCompany({ profile: { ...selected.profile, [key]: value } });
  }

  function updateVisual(change: Partial<VisualSettings>) {
    if (!selected) return;
    updateProfile("visual_settings", { ...defaultVisualSettings, ...selected.profile.visual_settings, ...change });
  }

  function updateColor(key: keyof VisualSettings["colors"], value: string) {
    updateVisual({ colors: { ...defaultVisualSettings.colors, ...selected?.profile.visual_settings?.colors, [key]: value } });
  }

  function updateVisualText(key: string, value: string) {
    updateVisual({ texts: { ...(selected?.profile.visual_settings?.texts ?? {}), [key]: value } });
  }

  function openCreateCompany() {
    setNewTemporaryPassword(generateTemporaryPassword());
    setCreatedAccess(null);
    setCredentialsCopied(false);
    setShowCreateCompany(true);
    setError("");
    setSuccess("");
  }

  function closeCreateCompany() {
    if (busy) return;
    setShowCreateCompany(false);
    setNewOwnerEmail("");
    setNewOwnerName("");
    setNewBusinessName("");
    setNewSlug("");
    setNewTemporaryPassword("");
    setCreatedAccess(null);
    setCredentialsCopied(false);
  }

  async function copyCreatedAccess() {
    if (!createdAccess) return;
    await navigator.clipboard.writeText([
      "Acesso Prife VIP",
      "https://www.prife-brasil.com/login",
      `E-mail: ${createdAccess.email}`,
      `Senha provisória: ${createdAccess.password}`,
      `Subdomínio: https://${createdAccess.hostname}`,
    ].join("\n"));
    setCredentialsCopied(true);
  }

  async function save() {
    if (!selected || busy) return;
    if (!selected.ownerName.trim() || !selected.businessName.trim()) {
      setError("Informe o nome do proprietário e o nome do negócio.");
      return;
    }
    setBusy("save"); setError(""); setSuccess("");
    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const profile = selected.profile;
      const payload = {
        p_tenant_id: selected.tenantId,
        p_owner_full_name: selected.ownerName.trim(),
        p_business_name: selected.businessName.trim(),
        p_public_email: profile.public_email,
        p_phone: profile.phone,
        p_whatsapp: profile.whatsapp,
        p_whatsapp_country_code: profile.whatsapp_country_code,
        p_whatsapp_area_code: profile.whatsapp_area_code,
        p_whatsapp_local_number: profile.whatsapp_local_number,
        p_address: profile.address,
        p_description: profile.description,
        p_instagram_url: profile.instagram_url,
        p_facebook_url: profile.facebook_url,
        p_youtube_url: profile.youtube_url,
        p_logo_url: profile.logo_url,
        p_cover_url: profile.cover_url,
        p_leader_role: profile.leader_role,
        p_leader_heading: profile.leader_heading,
        p_leader_quote: profile.leader_quote,
        p_leader_image_url: profile.leader_image_url,
        p_gallery_urls: profile.gallery_urls,
        p_gallery_titles: profile.gallery_titles,
        p_gallery_descriptions: profile.gallery_descriptions,
        p_video_urls: profile.video_urls,
        p_video_titles: profile.video_titles,
        p_video_descriptions: profile.video_descriptions,
        p_visual_settings: profile.visual_settings,
      };
      const saveRequest = fetch("/api/media/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "save_failed");
        return result;
      });
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error("save_timeout"));
        }, SAVE_TIMEOUT_MS);
      });
      const { error: saveError } = await Promise.race([saveRequest, timeout]);
      if (saveError) throw saveError;
      setSuccess("Informações atualizadas com segurança.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message.toLowerCase() : String(saveError ?? "").toLowerCase();
      if (message.includes("save_timeout") || message.includes("abort")) {
        setError("O salvamento demorou mais que o esperado. Verifique sua conexão e tente novamente; o botão já foi liberado.");
      } else if (message.includes("jwt") || message.includes("unauthorized") || message.includes("admin_access_required")) {
        setError("Sua sessão expirou ou não tem permissão. Entre novamente no painel e tente salvar.");
      } else if (message.includes("whatsapp_required")) {
        setError("Informe um WhatsApp válido antes de salvar.");
      } else if (message.includes("gallery") || message.includes("video")) {
        setError("Confira os limites da galeria: até 8 fotos e 4 vídeos.");
      } else {
        setError("Não foi possível salvar. Confira os campos e tente novamente.");
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setBusy("");
    }
  }

  async function applyVisualToAll() {
    if (!selected || !confirm("Aplicar cores, fontes, botões, animações, textos e organização deste site a todos os subdomínios?")) return;
    setBusy("all"); setError(""); setSuccess("");
    const { data, error: applyError } = await createClient().rpc("apply_tenant_visual_settings_to_all", { p_source_tenant_id: selected.tenantId });
    setBusy("");
    if (applyError) { setError("Não foi possível aplicar o visual aos demais subdomínios."); return; }
    setCompanies((current) => current.map((company) => ({ ...company, profile: { ...company.profile, visual_settings: selected.profile.visual_settings } })));
    setSuccess(`Visual aplicado a ${Number(data) || companies.length} subdomínios.`);
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalizedSlug = newSlug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!normalizedSlug || !newOwnerEmail.trim() || !newOwnerName.trim() || !newBusinessName.trim() || !newTemporaryPassword) {
      setError("Preencha todos os dados da conta e do subdomínio.");
      return;
    }
    if (newTemporaryPassword.length < 12 || !/[A-Z]/.test(newTemporaryPassword) || !/[a-z]/.test(newTemporaryPassword) || !/[0-9]/.test(newTemporaryPassword) || !/[^A-Za-z0-9]/.test(newTemporaryPassword)) {
      setError("A senha provisória precisa ter ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo.");
      return;
    }
    setBusy("create"); setError(""); setSuccess("");
    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      const createRequest = fetch("/api/admin/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          email: newOwnerEmail.trim().toLowerCase(),
          fullName: newOwnerName.trim(),
          slug: normalizedSlug,
          businessName: newBusinessName.trim(),
          temporaryPassword: newTemporaryPassword,
        }),
      }).then(async (response) => {
        const data = await response.json().catch(() => ({ error: "invalid_server_response" }));
        if (!response.ok) throw new Error(data?.error || `create_company_http_${response.status}`);
        if (!data?.company) throw new Error(data?.error || "create_company_failed");
        return data as { company: { tenant_id: string; slug: string; display_name: string; owner_user_id: string; owner_full_name: string; owner_email: string } };
      });
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          abortController.abort();
          reject(new Error("create_company_timeout"));
        }, CREATE_COMPANY_TIMEOUT_MS);
      });
      const result = await Promise.race([createRequest, timeout]);
      const created = result.company;
      const company: ManagedCompany = {
        tenantId: created.tenant_id,
        slug: created.slug,
        businessName: created.display_name,
        ownerUserId: created.owner_user_id,
        ownerName: created.owner_full_name,
        loginEmail: created.owner_email,
        status: "active",
        profile: { ...emptyTenantSiteProfile, visual_settings: { ...defaultVisualSettings, colors: { ...defaultVisualSettings.colors }, sections: [...defaultVisualSettings.sections], hiddenSections: [], texts: {}, galleryOrientations: [], videoOrientations: [] } },
      };
      setCompanies((current) => [...current, company]);
      setSelectedId(company.tenantId);
      setCreatedAccess({ email: created.owner_email, password: newTemporaryPassword, hostname: `${company.slug}.prife-brasil.com` });
      setSuccess(`Conta e subdomínio ${company.slug}.prife-brasil.com criados. Nenhum e-mail foi enviado.`);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message.toLowerCase() : String(createError ?? "").toLowerCase();
      if (timedOut || message.includes("create_company_timeout") || message.includes("abort")) {
        setError("A criação demorou mais que o esperado. Atualize a lista antes de tentar novamente; se o subdomínio não aparecer, repita a operação.");
      } else if (message.includes("owner_account_already_exists") || message.includes("already been registered")) {
        setError("Já existe uma conta com este e-mail. Use outro e-mail ou localize a conta existente antes de criar o subdomínio.");
      } else if (message.includes("account_creation_failed")) {
        setError("Não foi possível criar a conta de acesso. Confira o e-mail e tente novamente.");
      } else if (message.includes("owner_already_has_tenant")) {
        setError("Esse responsável já possui um subdomínio cadastrado.");
      } else if (message.includes("subdomain_already_exists") || message.includes("duplicate") || message.includes("unique")) {
        setError("Esse endereço de subdomínio já está em uso.");
      } else if (message.includes("weak_temporary_password")) {
        setError("A senha provisória não atende aos requisitos de segurança.");
      } else if (message.includes("invalid_subdomain") || message.includes("reserved_subdomain")) {
        setError("Escolha outro endereço: use letras minúsculas, números e hífen.");
      } else if (message.includes("jwt") || message.includes("unauthorized") || message.includes("admin_access_required")) {
        setError("Sua sessão expirou ou não tem permissão. Entre novamente no painel e tente criar o subdomínio.");
      } else if (message.includes("fetch") || message.includes("network") || message.includes("load failed")) {
        setError("Falha de conexão. Verifique sua internet e tente criar o subdomínio novamente.");
      } else {
        setError("Não foi possível criar o subdomínio. Confira os dados e tente novamente.");
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setBusy("");
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>, kind: "leader" | "gallery" | "videos") {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected || files.length === 0) return;
    const isVideo = kind === "videos";
    if (kind === "gallery" && selected.profile.gallery_urls.length + files.length > MAX_GALLERY_PHOTOS) {
      setError("A galeria permite no máximo 8 fotos."); return;
    }
    if (kind === "videos" && selected.profile.video_urls.length + files.length > MAX_GALLERY_VIDEOS) {
      setError("A área de vídeos permite no máximo 4 itens."); return;
    }
    const allowedTypes = isVideo ? VIDEO_TYPES : IMAGE_TYPES;
    const maxSize = (isVideo ? MAX_VIDEO_SIZE_MB : 15) * 1024 * 1024;
    const unsupported = files.find((file) => !allowedTypes[file.type]);
    if (unsupported) {
      setError(`O arquivo “${unsupported.name}” não é compatível. ${isVideo ? "Use vídeos MP4, WebM ou MOV." : "Use imagens JPG, PNG ou WebP."}`); return;
    }
    const oversized = files.find((file) => file.size > maxSize);
    if (oversized) {
      setError(`O arquivo “${oversized.name}” excede o limite de ${isVideo ? `${MAX_VIDEO_SIZE_MB} MB` : "15 MB"}.`); return;
    }
    const empty = files.find((file) => file.size === 0);
    if (empty) {
      setError(`O arquivo “${empty.name}” está vazio ou corrompido.`); return;
    }

    setBusy(kind); setUploadProgress(0); setError(""); setSuccess("");
    const urls: string[] = [];
    const uploadedPaths: string[] = [];
    try {
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      let completedBytes = 0;
      for (const originalFile of files) {
        const file = isVideo ? originalFile : await optimizeImage(originalFile);
        const uploaded = await uploadStorageObject({
          file,
          tenantId: selected.tenantId,
          kind,
          onProgress: (loaded) => setUploadProgress(Math.min(99, Math.round(((completedBytes + loaded) / totalBytes) * 100))),
        });
        completedBytes += originalFile.size;
        uploadedPaths.push(uploaded.path);
        urls.push(uploaded.publicUrl);
      }
    } catch (uploadError) {
      // Never initialize the browser Supabase client here: uploads use the
      // authenticated same-origin route and do not need browser credentials.
      setBusy(""); setUploadProgress(0); setError(readableUploadError(uploadError)); return;
    }
    if (kind === "leader") updateProfile("leader_image_url", urls[0]);
    if (kind === "gallery") {
      const start = selected.profile.gallery_urls.length;
      const currentVisual = { ...defaultVisualSettings, ...(selected.profile.visual_settings ?? {}) };
      updateCompany({ profile: {
        ...selected.profile,
        gallery_urls: [...selected.profile.gallery_urls, ...urls],
        gallery_titles: [...selected.profile.gallery_titles, ...urls.map((_, index) => `Foto ${start + index + 1}`)],
        gallery_descriptions: [...selected.profile.gallery_descriptions, ...urls.map(() => "Experiência Prife")],
        visual_settings: { ...currentVisual, galleryOrientations: [...(currentVisual.galleryOrientations ?? []), ...urls.map(() => "horizontal" as const)] },
      }});
    }
    if (kind === "videos") {
      const start = selected.profile.video_urls.length;
      const currentVisual = { ...defaultVisualSettings, ...(selected.profile.visual_settings ?? {}) };
      updateCompany({ profile: {
        ...selected.profile,
        video_urls: [...selected.profile.video_urls, ...urls],
        video_titles: [...selected.profile.video_titles, ...urls.map((_, index) => `Vídeo ${start + index + 1}`)],
        video_descriptions: [...selected.profile.video_descriptions, ...urls.map(() => "História em movimento")],
        visual_settings: { ...currentVisual, videoOrientations: [...(currentVisual.videoOrientations ?? []), ...urls.map(() => "horizontal" as const)] },
      }});
    }
    setBusy(""); setUploadProgress(0); setSuccess("Arquivo enviado. Clique em Salvar alterações para concluir.");
  }

  function addVideoUrl() {
    if (!selected) return;
    try {
      const url = new URL(videoUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      if (selected.profile.video_urls.length >= MAX_GALLERY_VIDEOS) { setError("A área de vídeos permite no máximo 4 itens."); return; }
      const currentVisual = { ...defaultVisualSettings, ...(selected.profile.visual_settings ?? {}) };
      updateCompany({ profile: {
        ...selected.profile,
        video_urls: [...selected.profile.video_urls, url.toString()],
        video_titles: [...selected.profile.video_titles, `Vídeo ${selected.profile.video_urls.length + 1}`],
        video_descriptions: [...selected.profile.video_descriptions, "História em movimento"],
        visual_settings: { ...currentVisual, videoOrientations: [...(currentVisual.videoOrientations ?? []), "horizontal"] },
      }});
      setVideoUrl("");
    } catch {
      setError("Informe um link válido de vídeo.");
    }
  }

  if (!selected) return <div className={styles.empty}>Nenhuma empresa disponível.</div>;
  const profile = selected.profile;
  const visual = { ...defaultVisualSettings, ...(profile.visual_settings ?? {}), colors: { ...defaultVisualSettings.colors, ...(profile.visual_settings?.colors ?? {}) }, texts: { ...(profile.visual_settings?.texts ?? {}) } };
  const sectionLabels: Record<string, string> = { hero: "Abertura", about: "Sobre a Prife", global: "Presença global", products: "Produtos", gallery: "Fotos e vídeos", leader: "Apresentação do líder", journey: "Jornada", faq: "Perguntas frequentes", contact: "Contato" };

  function moveSection(index: number, direction: -1 | 1) {
    const next = [...visual.sections];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    updateVisual({ sections: next });
  }

  function toggleSection(section: string) {
    updateVisual({ hiddenSections: visual.hiddenSections.includes(section) ? visual.hiddenSections.filter((item) => item !== section) : [...visual.hiddenSections, section] });
  }

  function updateListItem(key: "gallery_titles" | "gallery_descriptions" | "video_titles" | "video_descriptions", index: number, value: string) {
    const list = [...profile[key]];
    list[index] = value;
    updateProfile(key, list);
  }

  function updateMediaOrientation(kind: "gallery" | "video", index: number, value: MediaOrientation) {
    const key = kind === "gallery" ? "galleryOrientations" : "videoOrientations";
    const list = [...(visual[key] ?? [])];
    list[index] = value;
    updateVisual({ [key]: list });
  }

  function removeGalleryItem(index: number) {
    updateCompany({ profile: {
      ...profile,
      gallery_urls: profile.gallery_urls.filter((_, itemIndex) => itemIndex !== index),
      gallery_titles: profile.gallery_titles.filter((_, itemIndex) => itemIndex !== index),
      gallery_descriptions: profile.gallery_descriptions.filter((_, itemIndex) => itemIndex !== index),
      visual_settings: { ...visual, galleryOrientations: (visual.galleryOrientations ?? []).filter((_, itemIndex) => itemIndex !== index) },
    }});
  }

  function removeVideoItem(index: number) {
    updateCompany({ profile: {
      ...profile,
      video_urls: profile.video_urls.filter((_, itemIndex) => itemIndex !== index),
      video_titles: profile.video_titles.filter((_, itemIndex) => itemIndex !== index),
      video_descriptions: profile.video_descriptions.filter((_, itemIndex) => itemIndex !== index),
      visual_settings: { ...visual, videoOrientations: (visual.videoOrientations ?? []).filter((_, itemIndex) => itemIndex !== index) },
    }});
  }

  return (
    <div className={styles.workspace}>
      {adminMode && <aside className={styles.companyList}>
        <div><small>EMPRESAS</small><strong>{companies.length} espaços</strong></div>
        <button className={styles.newCompanyButton} type="button" onClick={openCreateCompany}><span>+</span><div><strong>Criar empresa e acesso</strong><small>Sem cadastro prévio</small></div></button>
        {companies.map((company) => <button key={company.tenantId} type="button" className={[company.tenantId === selectedId ? styles.activeCompany : "", isSubscriptionInactive(company.subscription, billingNow) ? styles.inactiveCompany : ""].filter(Boolean).join(" ")} onClick={() => { setSelectedId(company.tenantId); setError(""); setSuccess(""); }}>
          <span>{company.ownerName.slice(0, 1).toUpperCase()}</span><div><strong>{company.businessName}</strong><small>{company.slug}.prife-brasil.com</small><small>{subscriptionStatus(company.subscription, billingNow)}</small></div>
        </button>)}
      </aside>}

      {showCreateCompany && <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeCreateCompany}><form className={styles.createCompanyModal} onSubmit={createCompany} onMouseDown={(event) => event.stopPropagation()}>
        <div><div><small>NOVO ESPAÇO</small><h2>{createdAccess ? "Acesso provisório criado" : "Criar empresa e acesso"}</h2></div><button type="button" aria-label="Fechar" onClick={closeCreateCompany}>×</button></div>
        {createdAccess ? <>
          <p className={styles.creationConfirmed}>Tudo foi criado com sucesso. Nenhum e-mail foi enviado. Copie os dados e envie à pessoa somente quando o subdomínio estiver pronto.</p>
          <div className={styles.accessResult}>
            <span>E-mail de acesso<strong>{createdAccess.email}</strong></span>
            <span>Senha provisória<strong>{createdAccess.password}</strong></span>
            <span>Subdomínio<strong>{createdAccess.hostname}</strong></span>
            <span>Página de acesso<strong>www.prife-brasil.com/login</strong></span>
          </div>
          <button className={styles.createSubmit} type="button" onClick={copyCreatedAccess}>{credentialsCopied ? "Acesso copiado ✓" : "Copiar dados de acesso"}</button>
          <button className={styles.secondaryModalButton} type="button" onClick={closeCreateCompany}>Concluir</button>
        </> : <>
          <p>Nenhum e-mail será enviado. A conta, a empresa e o subdomínio serão criados agora; você poderá copiar e enviar o acesso quando tudo estiver pronto.</p>
          <label>E-mail de acesso<input type="email" required value={newOwnerEmail} onChange={(event) => setNewOwnerEmail(event.target.value)} placeholder="responsavel@email.com" /></label>
          <label>Nome do responsável<input required value={newOwnerName} onChange={(event) => setNewOwnerName(event.target.value)} placeholder="Nome completo" /></label>
          <label>Nome da empresa<input required value={newBusinessName} onChange={(event) => setNewBusinessName(event.target.value)} placeholder="Prife Nome" /></label>
          <label>Endereço do subdomínio<div className={styles.newSlugField}><input required pattern="[a-zA-Z0-9-]+" value={newSlug} onChange={(event) => setNewSlug(event.target.value)} placeholder="nome" /><span>.prife-brasil.com</span></div></label>
          <label>Senha provisória<div className={styles.passwordField}><input type="text" required minLength={12} maxLength={64} autoComplete="off" value={newTemporaryPassword} onChange={(event) => setNewTemporaryPassword(event.target.value)} /><button type="button" onClick={() => setNewTemporaryPassword(generateTemporaryPassword())}>Gerar outra</button></div><small>Guarde esta senha para enviar somente quando o subdomínio estiver pronto.</small></label>
          {error && <p className={styles.modalError} role="alert">{error}</p>}
          <button className={styles.createSubmit} type="submit" disabled={Boolean(busy)}>{busy === "create" ? "Criando conta e subdomínio…" : "Criar conta e subdomínio"}</button>
        </>}
      </form></div>}

      <section className={styles.editor}>
        <div className={styles.editorTop}>
          <div><small>{adminMode ? "EDIÇÃO ADMINISTRATIVA" : "MEU ESPAÇO"}</small><h1>{selected.businessName}</h1><a href={`https://${selected.slug}.prife-brasil.com`} target="_blank" rel="noreferrer">{selected.slug}.prife-brasil.com ↗</a></div>
          <button className={styles.saveButton} type="button" onClick={save} disabled={Boolean(busy)}>{busy === "save" ? "Salvando…" : "Salvar alterações"}</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        {adminMode && <SubscriptionPanel key={selected.tenantId} tenantId={selected.tenantId} slug={selected.slug} subscription={selected.subscription} now={billingNow} onChange={subscription => setCompanies(current => current.map(company => company.tenantId === selected.tenantId ? { ...company, subscription } : company))} />}

        <div className={styles.section}><div className={styles.sectionTitle}><b>01</b><div><h2>Perfil apresentado no site</h2><p>Foto, nome e textos do líder exibidos no subdomínio.</p></div><a className={styles.tenantLink} href={`https://${selected.slug}.prife-brasil.com`} target="_blank" rel="noreferrer" title="Abrir o subdomínio em uma nova aba"><span>LINK DO SUBDOMÍNIO</span><strong>{selected.slug}.prife-brasil.com</strong><i aria-hidden="true">↗</i></a></div>
          <div className={styles.profileVisual}>
            <MediaUpload title="Foto principal do líder" value={profile.leader_image_url} busy={busy === "leader"} accept={IMAGE_ACCEPT} onUpload={(e) => upload(e, "leader")} onRemove={() => updateProfile("leader_image_url", null)} />
            <div className={styles.formGrid}>
              <label>Nome apresentado<input value={selected.ownerName} onChange={(e) => updateCompany({ ownerName: e.target.value })} /></label>
              <label>Cargo ou função<input value={profile.leader_role ?? ""} onChange={(e) => updateProfile("leader_role", e.target.value)} placeholder="Líder de Expansão" /></label>
              <label className={styles.full}>Título principal<input value={profile.leader_heading ?? ""} maxLength={220} onChange={(e) => updateProfile("leader_heading", e.target.value)} /></label>
              <label className={styles.full}>Texto de apresentação<textarea rows={5} maxLength={1500} value={profile.description ?? ""} onChange={(e) => updateProfile("description", e.target.value)} /><small>{profile.description?.length ?? 0}/1500</small></label>
              <label className={styles.full}>Frase de destaque<textarea rows={3} maxLength={500} value={profile.leader_quote ?? ""} onChange={(e) => updateProfile("leader_quote", e.target.value)} /></label>
            </div>
          </div>
        </div>

        <div className={styles.section}><div className={styles.sectionTitle}><b>02</b><div><h2>WhatsApp internacional e redes</h2><p>Um único cadastro atualiza todos os botões e o rodapé.</p></div></div>
          <datalist id="international-country-codes"><option value="55">Brasil +55</option><option value="595">Paraguai +595</option><option value="54">Argentina +54</option><option value="598">Uruguai +598</option><option value="591">Bolívia +591</option><option value="1">EUA/Canadá +1</option><option value="351">Portugal +351</option><option value="34">Espanha +34</option><option value="52">México +52</option><option value="56">Chile +56</option><option value="57">Colômbia +57</option><option value="51">Peru +51</option><option value="60">Malásia +60</option></datalist>
          <div className={styles.phoneGrid}>
            <label>País / DDI<input inputMode="numeric" list="international-country-codes" value={profile.whatsapp_country_code ?? ""} onChange={(e) => updateProfile("whatsapp_country_code", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="55" /><small>Digite apenas números.</small></label>
            <label>Código de área / DDD<input inputMode="numeric" value={profile.whatsapp_area_code ?? ""} onChange={(e) => updateProfile("whatsapp_area_code", e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="44" /><small>Se o país utilizar.</small></label>
            <label>Número do WhatsApp<input inputMode="numeric" value={profile.whatsapp_local_number ?? ""} onChange={(e) => updateProfile("whatsapp_local_number", e.target.value.replace(/\D/g, "").slice(0, 15))} placeholder="998847361" /><small>Sem espaços ou traços.</small></label>
          </div>
          <div className={styles.phonePreview}>Link gerado: <strong>+{profile.whatsapp_country_code || "—"} {profile.whatsapp_area_code || ""} {profile.whatsapp_local_number || ""}</strong></div>
          <div className={styles.formGrid}>
            <label>E-mail público<input type="email" value={profile.public_email ?? ""} onChange={(e) => updateProfile("public_email", e.target.value)} placeholder="contato@empresa.com" /></label>
            <label>Telefone adicional<input value={profile.phone ?? ""} onChange={(e) => updateProfile("phone", e.target.value)} placeholder="+55 44 99999-9999" /></label>
            <label className={styles.full}>Endereço público<input value={profile.address ?? ""} onChange={(e) => updateProfile("address", e.target.value)} placeholder="Cidade, Estado, País" /></label>
            <label>Instagram<input value={profile.instagram_url ?? ""} onChange={(e) => updateProfile("instagram_url", e.target.value)} placeholder="@usuario ou https://instagram.com/usuario" /></label>
            <label>YouTube<input value={profile.youtube_url ?? ""} onChange={(e) => updateProfile("youtube_url", e.target.value)} placeholder="@canal ou https://youtube.com/@canal" /></label>
          </div>
        </div>

        <div className={styles.section}><div className={styles.sectionTitle}><b>03</b><div><h2>Galeria de fotos</h2><p>Estas imagens e legendas substituem a galeria do subdomínio.</p></div></div>
          <div className={styles.mediaHeader}><div><h3>8 espaços de fotos</h3><p>Até 8 fotos; escolha horizontal ou vertical para cada imagem.</p></div><label className={styles.uploadButton}>{busy === "gallery" ? "Enviando…" : "+ Adicionar fotos"}<input type="file" accept={IMAGE_ACCEPT} multiple onChange={(e) => upload(e, "gallery")} disabled={Boolean(busy) || profile.gallery_urls.length >= MAX_GALLERY_PHOTOS} /></label></div>
          <div className={styles.galleryEditor}>
            {profile.gallery_urls.slice(0, MAX_GALLERY_PHOTOS).map((url, index) => <article key={`${url}-${index}`}><div><img src={url} alt={`Foto ${index + 1}`} /><button type="button" aria-label={`Remover foto ${index + 1}`} onClick={() => removeGalleryItem(index)}>×</button></div><label>Formato recomendado (largura × altura)<select value={visual.galleryOrientations?.[index] ?? "horizontal"} onChange={(e) => updateMediaOrientation("gallery", index, e.target.value as MediaOrientation)}><option value="horizontal">Horizontal — 1600 × 1000 px</option><option value="vertical">Vertical — 1200 × 1600 px</option></select></label><label>Título<input value={profile.gallery_titles[index] ?? ""} onChange={(e) => updateListItem("gallery_titles", index, e.target.value)} /></label><label>Legenda<input value={profile.gallery_descriptions[index] ?? ""} onChange={(e) => updateListItem("gallery_descriptions", index, e.target.value)} /></label></article>)}
            {Array.from({ length: Math.max(0, MAX_GALLERY_PHOTOS - profile.gallery_urls.length) }, (_, index) => <article className={styles.emptyMediaSlot} key={`empty-photo-${index}`}><span>+</span><strong>Foto {profile.gallery_urls.length + index + 1}</strong><small>Horizontal: 1600 × 1000 px · Vertical: 1200 × 1600 px</small></article>)}
          </div>
        </div>

        <div className={styles.section}><div className={styles.sectionTitle}><b>04</b><div><h2>Galeria de vídeos</h2><p>Envie vídeos ou use links do YouTube e Vimeo.</p></div></div>
          <div className={styles.mediaHeader}><div><h3>4 espaços de vídeos</h3><p>Até 4 vídeos de 50 MB. Para carregar mais rápido no celular, prefira um link do YouTube ou Vimeo.</p></div></div>
          <div className={styles.videoActions}><label className={styles.uploadButton}>{busy === "videos" ? `Enviando ${uploadProgress}%` : "+ Enviar vídeo"}<input type="file" accept={VIDEO_ACCEPT} multiple onChange={(e) => upload(e, "videos")} disabled={Boolean(busy) || profile.video_urls.length >= MAX_GALLERY_VIDEOS} /></label><div><input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Cole um link do YouTube ou Vimeo" disabled={profile.video_urls.length >= MAX_GALLERY_VIDEOS} /><button type="button" onClick={addVideoUrl} disabled={profile.video_urls.length >= MAX_GALLERY_VIDEOS}>Adicionar</button></div></div>
          <div className={styles.videoEditor}>{profile.video_urls.slice(0, MAX_GALLERY_VIDEOS).map((url, index) => <article key={`${url}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><a href={url} target="_blank" rel="noreferrer">Visualizar vídeo ↗</a><label>Formato recomendado (largura × altura)<select value={visual.videoOrientations?.[index] ?? "horizontal"} onChange={(e) => updateMediaOrientation("video", index, e.target.value as MediaOrientation)}><option value="horizontal">Horizontal — 1920 × 1080 px</option><option value="vertical">Vertical — 1080 × 1920 px</option></select></label><label>Título<input value={profile.video_titles[index] ?? ""} onChange={(e) => updateListItem("video_titles", index, e.target.value)} /></label><label>Descrição<input value={profile.video_descriptions[index] ?? ""} onChange={(e) => updateListItem("video_descriptions", index, e.target.value)} /></label></div><button type="button" onClick={() => removeVideoItem(index)}>Remover</button></article>)}{Array.from({ length: Math.max(0, MAX_GALLERY_VIDEOS - profile.video_urls.length) }, (_, index) => <article className={styles.emptyVideoSlot} key={`empty-video-${index}`}><span>{String(profile.video_urls.length + index + 1).padStart(2, "0")}</span><div><strong>Vídeo disponível</strong><small>Horizontal: 1920 × 1080 px · Vertical: 1080 × 1920 px</small></div></article>)}</div>
        </div>

        <div className={styles.section}><div className={styles.sectionTitle}><b>05</b><div><h2>Editor visual completo</h2><p>Personalize aparência, conteúdo, ordem e efeitos sem mexer em código.</p></div></div>
          <div className={styles.visualPreview} style={{ "--preview-accent": visual.colors.accent, "--preview-bg": visual.colors.background, "--preview-text": visual.colors.text } as CSSProperties}>
            <small>PRÉVIA DO TEMA</small><strong>{visual.texts.heroTitle || "O futuro do bem-estar começa agora."}</strong><button type="button">{visual.texts.heroButton || "Quero conhecer"} →</button>
          </div>
          <h3 className={styles.subheading}>Cores e identidade</h3>
          <div className={styles.colorGrid}>{([['accent','Cor principal'],['accentSecondary','Cor secundária'],['background','Fundo'],['surface','Cartões'],['text','Textos']] as const).map(([key,label]) => <label key={key}>{label}<span><input type="color" value={visual.colors[key]} onChange={(e) => updateColor(key,e.target.value)} /><input value={visual.colors[key]} maxLength={7} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && updateColor(key,e.target.value)} /></span></label>)}</div>
          <h3 className={styles.subheading}>Fonte, dimensões e efeitos</h3>
          <div className={styles.formGrid}>
            <label>Família da fonte<select value={visual.fontFamily} onChange={(e) => updateVisual({ fontFamily: e.target.value as VisualSettings['fontFamily'] })}><option value="manrope">Manrope — moderna</option><option value="geist">Geist — tecnológica</option><option value="system">Sistema — limpa</option></select></label>
            <label>Animações<select value={visual.motion} onChange={(e) => updateVisual({ motion: e.target.value as VisualSettings['motion'] })}><option value="full">Completas</option><option value="subtle">Suaves</option><option value="off">Desativadas</option></select></label>
            <label>Tamanho geral da fonte: {visual.fontScale}%<input type="range" min="85" max="125" value={visual.fontScale} onChange={(e) => updateVisual({ fontScale: Number(e.target.value) })} /></label>
            <label>Largura do conteúdo: {visual.contentWidth}px<input type="range" min="980" max="1480" step="10" value={visual.contentWidth} onChange={(e) => updateVisual({ contentWidth: Number(e.target.value) })} /></label>
            <label>Formato dos botões<select value={visual.buttonStyle} onChange={(e) => updateVisual({ buttonStyle: e.target.value as VisualSettings['buttonStyle'] })}><option value="pill">Cápsula</option><option value="rounded">Arredondado</option><option value="square">Reto</option></select></label>
            <label>Estilo dos cartões<select value={visual.cardStyle} onChange={(e) => updateVisual({ cardStyle: e.target.value as VisualSettings['cardStyle'] })}><option value="glass">Vidro</option><option value="solid">Sólido</option><option value="outline">Contorno</option></select></label>
          </div>
          <h3 className={styles.subheading}>Ordem e visibilidade das seções</h3>
          <div className={styles.sectionSorter}>{visual.sections.map((section,index) => <article key={section} className={visual.hiddenSections.includes(section) ? styles.sectionHidden : ""}><span>{String(index + 1).padStart(2,'0')}</span><strong>{sectionLabels[section] ?? section}</strong><label><input type="checkbox" checked={!visual.hiddenSections.includes(section)} onChange={() => toggleSection(section)} /> Exibir</label><button type="button" disabled={index === 0} onClick={() => moveSection(index,-1)}>↑</button><button type="button" disabled={index === visual.sections.length - 1} onClick={() => moveSection(index,1)}>↓</button></article>)}</div>
          <h3 className={styles.subheading}>Textos principais e botões</h3>
          <div className={styles.formGrid}>
            <label className={styles.full}>Título de abertura<input value={visual.texts.heroTitle ?? ""} onChange={(e) => updateVisualText('heroTitle',e.target.value)} placeholder="Deixe vazio para usar o texto padrão" /></label>
            <label>Botão de abertura<input value={visual.texts.heroButton ?? ""} onChange={(e) => updateVisualText('heroButton',e.target.value)} placeholder="Quero conhecer" /></label>
            <label>Botão de contato<input value={visual.texts.contactButton ?? ""} onChange={(e) => updateVisualText('contactButton',e.target.value)} placeholder="Conhecer os produtos" /></label>
            <label className={styles.full}>Descrição de abertura<textarea rows={3} value={visual.texts.heroDescription ?? ""} onChange={(e) => updateVisualText('heroDescription',e.target.value)} placeholder="Deixe vazio para usar a descrição padrão" /></label>
            <label>Título da seção Sobre<input value={visual.texts.aboutTitle ?? ""} onChange={(e) => updateVisualText('aboutTitle',e.target.value)} /></label>
            <label>Título de Produtos<input value={visual.texts.productsTitle ?? ""} onChange={(e) => updateVisualText('productsTitle',e.target.value)} /></label>
            <label>Título da Galeria<input value={visual.texts.galleryTitle ?? ""} onChange={(e) => updateVisualText('galleryTitle',e.target.value)} /></label>
            <label>Título de Contato<input value={visual.texts.contactTitle ?? ""} onChange={(e) => updateVisualText('contactTitle',e.target.value)} /></label>
          </div>
          <h3 className={styles.subheading}>Perguntas frequentes</h3>
          <p className={styles.editorHelp}>Deixe um campo vazio para usar o conteúdo padrão do site principal.</p>
          <div className={styles.formGrid}>
            <label>Título — primeira linha<input maxLength={90} value={visual.texts.faqTitleLine1 ?? defaultFaqTitleLine1} onChange={(e) => updateVisualText('faqTitleLine1', e.target.value)} /></label>
            <label>Título — destaque<input maxLength={90} value={visual.texts.faqTitleLine2 ?? defaultFaqTitleLine2} onChange={(e) => updateVisualText('faqTitleLine2', e.target.value)} /></label>
            <label className={styles.full}>Texto de apresentação<textarea rows={3} maxLength={600} value={visual.texts.faqDescription ?? defaultFaqDescription} onChange={(e) => updateVisualText('faqDescription', e.target.value)} /></label>
          </div>
          <div className={styles.faqEditor}>
            {defaultFaqItems.map(([question, answer], index) => <article key={question}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <div className={styles.formGrid}>
                <label className={styles.full}>Pergunta<input maxLength={180} value={visual.texts[`faqQuestion${index + 1}`] ?? question} onChange={(e) => updateVisualText(`faqQuestion${index + 1}`, e.target.value)} /></label>
                <label className={styles.full}>Resposta<textarea rows={4} maxLength={900} value={visual.texts[`faqAnswer${index + 1}`] ?? answer} onChange={(e) => updateVisualText(`faqAnswer${index + 1}`, e.target.value)} /></label>
              </div>
            </article>)}
          </div>
          <div className={styles.globalActions}><button className={styles.applyAllButton} type="button" onClick={applyVisualToAll} disabled={Boolean(busy)}>{busy === 'all' ? 'Aplicando…' : 'Aplicar este visual a todos os subdomínios'}</button><p>Salve este site e replique o mesmo padrão visual para os demais.</p></div>
        </div>
        <button className={`${styles.saveButton} ${styles.bottomSave}`} type="button" onClick={save} disabled={Boolean(busy)}>{busy === "save" ? "Salvando…" : "Salvar todas as alterações"}</button>
        {error && <p role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}
      </section>
    </div>
  );
}

function MediaUpload({ title, value, busy, accept, onUpload, onRemove }: { title: string; value: string | null; busy: boolean; accept: string; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  return <article className={styles.mediaUpload}><div>{value ? <img src={value} alt={title} /> : <span>+</span>}</div><div><h3>{title}</h3><p><strong>Tamanho recomendado: 1080 × 1350 px</strong> (vertical, proporção 4:5).<br />JPG, PNG ou WebP — convertido automaticamente para WebP leve.</p><label className={styles.uploadButton}>{busy ? "Enviando…" : value ? "Trocar imagem" : "Enviar imagem"}<input type="file" accept={accept} onChange={onUpload} disabled={busy} /></label>{value && <button className={styles.removeMedia} type="button" onClick={onRemove}>Remover</button>}</div></article>;
}
