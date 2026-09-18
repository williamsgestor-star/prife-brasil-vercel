const DAILY_API = "https://api.daily.co/v1";
const SESSION_SECONDS = 2 * 60 * 60;
const DAILY_REQUEST_TIMEOUT_MS = 15_000;

const roomProperties = {
  enable_prejoin_ui: true,
  enable_chat: true,
  enable_people_ui: true,
  enable_screenshare: true,
  enable_cpu_warning_notifications: true,
  enable_video_processing_ui: false,
  start_video_off: false,
  start_audio_off: false,
  enable_adaptive_simulcast: true,
  enable_multiparty_adaptive_simulcast: true,
  experimental_optimize_large_calls: true,
  lang: "pt-BR",
};

function dailyRequestInit(init: RequestInit = {}): RequestInit {
  return { ...init, signal: AbortSignal.timeout(DAILY_REQUEST_TIMEOUT_MS) };
}

type InvitePayload = {
  v: 1;
  slug: string;
  roomName: string;
  exp: number;
};

type DailyRoom = {
  name?: string;
  url?: string;
};

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function inviteSignature(encodedPayload: string, apiKey: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`prife-daily-invite:${apiKey}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return bytesToBase64Url(new Uint8Array(signature));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function normalizeMeetingSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export function meetingOriginForSlug(slug: string) {
  return slug === "williams" ? "https://www.prife-brasil.com" : `https://${slug}.prife-brasil.com`;
}

export async function getOrCreateDailyRoom(apiKey: string, slug: string) {
  const roomName = `prife-${normalizeMeetingSlug(slug)}`;
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  let response = await fetch(`${DAILY_API}/rooms/${roomName}`, dailyRequestInit({ headers, cache: "no-store" }));

  if (response.status === 404) {
    response = await fetch(`${DAILY_API}/rooms`, dailyRequestInit({
      method: "POST",
      headers,
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: roomProperties,
      }),
    }));
  } else if (response.ok) {
    // Apply stability settings to rooms created before these defaults existed.
    response = await fetch(`${DAILY_API}/rooms/${roomName}`, dailyRequestInit({
      method: "POST",
      headers,
      body: JSON.stringify({ properties: roomProperties }),
    }));
  }

  if (!response.ok) throw new Error("daily_room");
  const room = await response.json() as DailyRoom;
  if (!room.url) throw new Error("daily_room_incomplete");
  return { roomName, roomUrl: room.url };
}

export async function createDailyMeetingToken(
  apiKey: string,
  roomName: string,
  userName: string,
  options: { enableRecording?: boolean; expiresAt?: number; isOwner?: boolean; userId?: string } = {},
) {
  const exp = Math.min(
    options.expiresAt ?? Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  );
  const properties: Record<string, string | number | boolean> = {
    room_name: roomName,
    user_name: userName.slice(0, 80),
    lang: "pt-BR",
    is_owner: options.isOwner === true,
    exp,
    eject_at_token_exp: true,
  };
  if (options.userId) properties.user_id = options.userId;
  if (options.enableRecording) properties.enable_recording = "cloud";

  const response = await fetch(`${DAILY_API}/meeting-tokens`, dailyRequestInit({
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties }),
  }));
  if (!response.ok) throw new Error("daily_token");
  const data = await response.json() as { token?: string };
  if (!data.token) throw new Error("daily_token_incomplete");
  return { token: data.token, exp };
}

export function recordingPasswordIsValid(value: unknown) {
  const expected = String(process.env.DAILY_RECORDING_PASSWORD || "").trim();
  const supplied = typeof value === "string" ? value.trim() : "";
  return expected.length >= 8 && supplied.length === expected.length && safeEqual(supplied, expected);
}

export async function createMeetingInvite(apiKey: string, slug: string, roomName: string) {
  const payload: InvitePayload = {
    v: 1,
    slug: normalizeMeetingSlug(slug),
    roomName,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await inviteSignature(encodedPayload, apiKey);
  return { invite: `${encodedPayload}.${signature}`, expiresAt: payload.exp };
}

export async function verifyMeetingInvite(invite: string, apiKey: string) {
  const [encodedPayload, suppliedSignature, extra] = invite.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;
  const expectedSignature = await inviteSignature(encodedPayload, apiKey);
  if (!safeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as InvitePayload;
    const slug = normalizeMeetingSlug(String(payload.slug || ""));
    if (
      payload.v !== 1 ||
      !slug ||
      payload.slug !== slug ||
      payload.roomName !== `prife-${slug}` ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export const MEETING_SESSION_SECONDS = SESSION_SECONDS;
