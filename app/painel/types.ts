export type VisualSettings = {
  colors: { accent: string; accentSecondary: string; background: string; surface: string; text: string };
  fontFamily: "manrope" | "geist" | "system";
  fontScale: number;
  contentWidth: number;
  radius: number;
  buttonStyle: "pill" | "rounded" | "square";
  cardStyle: "glass" | "solid" | "outline";
  motion: "off" | "subtle" | "full";
  sections: string[];
  hiddenSections: string[];
  texts: Record<string, string>;
  galleryOrientations: Array<"horizontal" | "vertical">;
  videoOrientations: Array<"horizontal" | "vertical">;
};

export const defaultVisualSettings: VisualSettings = {
  colors: { accent: "#20ddea", accentSecondary: "#49f3c6", background: "#020921", surface: "#071a43", text: "#f3fbff" },
  fontFamily: "manrope", fontScale: 100, contentWidth: 1240, radius: 22,
  buttonStyle: "pill", cardStyle: "glass", motion: "full",
  sections: ["hero", "about", "global", "products", "gallery", "leader", "journey", "faq", "contact"],
  hiddenSections: [], texts: {}, galleryOrientations: [], videoOrientations: [],
};

export type TenantSiteProfile = {
  public_email: string | null;
  phone: string | null;
  whatsapp: string | null;
  whatsapp_country_code: string | null;
  whatsapp_area_code: string | null;
  whatsapp_local_number: string | null;
  address: string | null;
  description: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  logo_url: string | null;
  cover_url: string | null;
  leader_role: string | null;
  leader_heading: string | null;
  leader_quote: string | null;
  leader_image_url: string | null;
  gallery_urls: string[];
  gallery_titles: string[];
  gallery_descriptions: string[];
  video_urls: string[];
  video_titles: string[];
  video_descriptions: string[];
  visual_settings: VisualSettings;
};

export type ManagedCompany = {
  subscription?: import("../lib/site-subscription").SiteSubscription | null;
  tenantId: string;
  slug: string;
  businessName: string;
  ownerUserId: string;
  ownerName: string;
  loginEmail: string;
  status: string;
  profile: TenantSiteProfile;
};

export const emptyTenantSiteProfile: TenantSiteProfile = {
  public_email: null,
  phone: null,
  whatsapp: null,
  whatsapp_country_code: "55",
  whatsapp_area_code: null,
  whatsapp_local_number: null,
  address: null,
  description: null,
  instagram_url: null,
  facebook_url: null,
  youtube_url: null,
  logo_url: null,
  cover_url: null,
  leader_role: "Líder de Expansão",
  leader_heading: "Conhecimento, direção e uma visão de futuro.",
  leader_quote: "Mais do que conhecer produtos, é compreender uma nova forma de conectar bem-estar, inovação e oportunidade.",
  leader_image_url: null,
  gallery_urls: [],
  gallery_titles: [],
  gallery_descriptions: [],
  video_urls: [],
  video_titles: [],
  video_descriptions: [],
  visual_settings: defaultVisualSettings,
};
