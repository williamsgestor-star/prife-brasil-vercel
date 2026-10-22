"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./LeadMap.module.css";

export type MapLead = {
  sourceId: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type LeafletMap = {
  remove: () => void;
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => void;
  setView: (center: [number, number], zoom: number) => void;
  invalidateSize: () => void;
};
type LeafletLayer = { addTo: (map: unknown) => LeafletLayer; clearLayers: () => void; addLayer: (layer: unknown) => void };
type LeafletGlobal = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: unknown) => void };
  layerGroup: () => LeafletLayer;
  circleMarker: (latlng: [number, number], options?: Record<string, unknown>) => {
    bindPopup: (html: string) => unknown;
    on: (event: string, handler: () => void) => unknown;
  };
  latLngBounds: (points: Array<[number, number]>) => unknown;
};

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_CSS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.min.css`;
const LEAFLET_JS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.min.js`;

let leafletPromise: Promise<LeafletGlobal> | null = null;

// O Leaflet só é baixado quando o mapa aparece, para não pesar o carregamento do Prospector.
function loadLeaflet(): Promise<LeafletGlobal> {
  const existing = (window as unknown as { L?: LeafletGlobal }).L;
  if (existing) return Promise.resolve(existing);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      const L = (window as unknown as { L?: LeafletGlobal }).L;
      if (L) resolve(L); else reject(new Error("leaflet_missing"));
    };
    script.onerror = () => { leafletPromise = null; reject(new Error("leaflet_load_failed")); };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);

type Props = {
  leads: MapLead[];
  title: string;
  onSelect?: (index: number) => void;
};

export default function LeadMap({ leads, title, onSelect }: Props) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LeafletLayer | null>(null);
  const [failed, setFailed] = useState(false);
  const points = leads
    .map((lead, index) => ({ lead, index }))
    .filter(({ lead }) => typeof lead.latitude === "number" && typeof lead.longitude === "number"
      && Number.isFinite(lead.latitude) && Number.isFinite(lead.longitude));
  const pointsKey = points.map(({ lead }) => `${lead.sourceId}:${lead.latitude}:${lead.longitude}`).join("|");

  useEffect(() => {
    if (!points.length || !elementRef.current) return;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !elementRef.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(elementRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
          subdomains: "abcd",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      const layer = layerRef.current!;
      layer.clearLayers();
      const coords: Array<[number, number]> = [];
      points.forEach(({ lead, index }) => {
        const latlng: [number, number] = [lead.latitude as number, lead.longitude as number];
        coords.push(latlng);
        const marker = L.circleMarker(latlng, {
          radius: 7,
          color: "#ffffff",
          weight: 1.2,
          fillColor: "#ef3b3b",
          fillOpacity: 0.92,
        });
        marker.bindPopup(
          `<strong>${escapeHtml(lead.name)}</strong><br><span>${escapeHtml(lead.category || "")}</span>`
          + (lead.address ? `<br><small>${escapeHtml(lead.address)}</small>` : ""),
        );
        marker.on("click", () => onSelect?.(index));
        layer.addLayer(marker);
      });
      if (coords.length === 1) mapRef.current!.setView(coords[0], 15);
      else mapRef.current!.fitBounds(L.latLngBounds(coords), { padding: [28, 28], maxZoom: 16 });
      window.setTimeout(() => mapRef.current?.invalidateSize(), 60);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; layerRef.current = null; }, []);

  if (!points.length) return null;
  return (
    <section className={styles.wrap} aria-label={title}>
      <div className={styles.badges}>
        <span className={styles.place}><i aria-hidden="true" />{title}</span>
        <span className={styles.count}>{points.length.toLocaleString("pt-BR")} no mapa</span>
      </div>
      {failed ? <p className={styles.failed}>Não foi possível carregar o mapa agora.</p> : <div ref={elementRef} className={styles.map} />}
    </section>
  );
}
