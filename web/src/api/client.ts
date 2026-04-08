import { fetchStaticCatalogJson } from "./staticCatalog";

const STATIC_DATA_MODE = import.meta.env.VITE_STATIC_DATA_MODE === "1";
const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  `${window.location.protocol}//${window.location.hostname}:8000/api`;

export async function fetchJson<T>(path: string): Promise<T> {
  if (STATIC_DATA_MODE) {
    return fetchStaticCatalogJson<T>(path);
  }

  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
