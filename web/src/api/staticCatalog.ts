import { buildNoDataTags, isNoDataTag } from "../catalogMeta";
import type { Motorcycle, PaginatedResponse, Tag } from "../types";

type StaticCatalogData = {
  generated_at: string;
  motorcycles: Motorcycle[];
  tags: Tag[];
};

const STATIC_DATA_URL = `${import.meta.env.BASE_URL}data/catalog-data.json`;
const V_ENGINE_LAYOUT_TAGS = new Set(["V型", "L型", "L型（V型）"]);
const LEGACY_L_ENGINE_LAYOUT_TAGS = new Set(["L型", "L型（V型）"]);

let staticCatalogPromise: Promise<StaticCatalogData> | null = null;

function getCatalogTags(data: StaticCatalogData) {
  return [...data.tags, ...buildNoDataTags(data.tags, data.motorcycles)];
}

function hasNoCategoryData(motorcycle: Motorcycle, category: string) {
  return !motorcycle.tags.some((tag) => tag.category === category);
}

function toFiniteNumber(value: string | null, fallback: number) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBound(value: string | null) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareNullableNumber(
  left: number | null | undefined,
  right: number | null | undefined,
  direction: "asc" | "desc"
) {
  if (left == null && right == null) return 0;
  if (left == null) return direction === "asc" ? -1 : 1;
  if (right == null) return direction === "asc" ? 1 : -1;
  return direction === "asc" ? left - right : right - left;
}

function matchesMinMax(
  value: number | null | undefined,
  min: number | null,
  max: number | null
) {
  if (min != null && (value == null || value < min)) return false;
  if (max != null && (value == null || value > max)) return false;
  return true;
}

function getEquivalentTagIds(tags: Tag[], tag: Tag | undefined) {
  if (!tag) return [];
  if (tag.category === "engine_layout" && tag.name === "V型") {
    return tags
      .filter((candidate) => candidate.category === "engine_layout" && V_ENGINE_LAYOUT_TAGS.has(candidate.name))
      .map((candidate) => candidate.id);
  }
  if (tag.category === "engine_layout" && tag.name === "L型") {
    return tags
      .filter(
        (candidate) =>
          candidate.category === "engine_layout" && LEGACY_L_ENGINE_LAYOUT_TAGS.has(candidate.name)
      )
      .map((candidate) => candidate.id);
  }
  return [tag.id];
}

function sortMotorcycles(items: Motorcycle[], sortKey: string | null) {
  const sorters: Record<string, (left: Motorcycle, right: Motorcycle) => number> = {
    displacement_asc: (left, right) =>
      compareNullableNumber(left.displacement, right.displacement, "asc") || left.id - right.id,
    displacement_desc: (left, right) =>
      compareNullableNumber(left.displacement, right.displacement, "desc") || left.id - right.id,
    power_asc: (left, right) =>
      compareNullableNumber(left.max_power, right.max_power, "asc") || left.id - right.id,
    power_desc: (left, right) =>
      compareNullableNumber(left.max_power, right.max_power, "desc") || left.id - right.id,
    seat_height_asc: (left, right) =>
      compareNullableNumber(left.seat_height, right.seat_height, "asc") || left.id - right.id,
    seat_height_desc: (left, right) =>
      compareNullableNumber(left.seat_height, right.seat_height, "desc") || left.id - right.id,
    weight_asc: (left, right) =>
      compareNullableNumber(left.wet_weight, right.wet_weight, "asc") || left.id - right.id,
    weight_desc: (left, right) =>
      compareNullableNumber(left.wet_weight, right.wet_weight, "desc") || left.id - right.id,
    price_asc: (left, right) =>
      compareNullableNumber(left.price, right.price, "asc") || left.id - right.id,
    price_desc: (left, right) =>
      compareNullableNumber(left.price, right.price, "desc") || left.id - right.id,
  };

  if (!sortKey || !(sortKey in sorters)) {
    return items;
  }

  return [...items].sort(sorters[sortKey]);
}

function filterMotorcycles(data: StaticCatalogData, searchParams: URLSearchParams): PaginatedResponse<Motorcycle> {
  const catalogTags = getCatalogTags(data);
  const selectedTags = new Map(catalogTags.map((tag) => [tag.id, tag]));
  const q = searchParams.get("q")?.trim().toLowerCase();
  const tagIds = searchParams
    .getAll("tag_ids")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));
  const orTagIds = searchParams
    .getAll("or_tag_ids")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));
  const maker = searchParams.get("maker");
  const status = searchParams.get("status");

  const displacementMin = searchParams.get("displacement_min");
  const displacementMax = searchParams.get("displacement_max");
  const yearMin = searchParams.get("year_min");
  const yearMax = searchParams.get("year_max");
  const powerMin = searchParams.get("power_min");
  const powerMax = searchParams.get("power_max");
  const torqueMin = searchParams.get("torque_min");
  const torqueMax = searchParams.get("torque_max");
  const seatHeightMin = searchParams.get("seat_height_min");
  const seatHeightMax = searchParams.get("seat_height_max");
  const weightMin = searchParams.get("weight_min");
  const weightMax = searchParams.get("weight_max");

  const normalizedBounds = {
    displacementMin: parseBound(displacementMin),
    displacementMax: parseBound(displacementMax),
    yearMin: parseBound(yearMin),
    yearMax: parseBound(yearMax),
    powerMin: parseBound(powerMin),
    powerMax: parseBound(powerMax),
    torqueMin: parseBound(torqueMin),
    torqueMax: parseBound(torqueMax),
    seatHeightMin: parseBound(seatHeightMin),
    seatHeightMax: parseBound(seatHeightMax),
    weightMin: parseBound(weightMin),
    weightMax: parseBound(weightMax),
  };

  let items = data.motorcycles.filter((motorcycle) => {
    if (maker && motorcycle.maker !== maker) return false;
    if (q && !motorcycle.name.toLowerCase().includes(q)) return false;
    if (!matchesMinMax(motorcycle.displacement, normalizedBounds.displacementMin, normalizedBounds.displacementMax)) return false;
    if (!matchesMinMax(motorcycle.year, normalizedBounds.yearMin, normalizedBounds.yearMax)) return false;
    if (!matchesMinMax(motorcycle.max_power, normalizedBounds.powerMin, normalizedBounds.powerMax)) return false;
    if (!matchesMinMax(motorcycle.max_torque, normalizedBounds.torqueMin, normalizedBounds.torqueMax)) return false;
    if (!matchesMinMax(motorcycle.seat_height, normalizedBounds.seatHeightMin, normalizedBounds.seatHeightMax)) return false;
    if (!matchesMinMax(motorcycle.wet_weight, normalizedBounds.weightMin, normalizedBounds.weightMax)) return false;
    if (status && motorcycle.status !== status) return false;
    return true;
  });

  for (const tagId of tagIds) {
    const selectedTag = selectedTags.get(tagId);
    if (!selectedTag) continue;
    if (isNoDataTag(selectedTag)) {
      items = items.filter((motorcycle) => hasNoCategoryData(motorcycle, selectedTag.category));
      continue;
    }
    const equivalentTagIds = new Set(getEquivalentTagIds(catalogTags, selectedTag) || [tagId]);
    items = items.filter((motorcycle) => motorcycle.tags.some((tag) => equivalentTagIds.has(tag.id)));
  }

  if (orTagIds.length > 0) {
    const tagsByCategory = new Map<string, { tagIds: Set<number>; matchMissing: boolean }>();
    for (const tagId of orTagIds) {
      const tag = selectedTags.get(tagId);
      if (!tag) continue;
      const categoryFilter = tagsByCategory.get(tag.category) ?? {
        tagIds: new Set<number>(),
        matchMissing: false,
      };
      if (isNoDataTag(tag)) {
        categoryFilter.matchMissing = true;
      } else {
        for (const equivalentTagId of getEquivalentTagIds(catalogTags, tag)) {
          categoryFilter.tagIds.add(equivalentTagId);
        }
      }
      tagsByCategory.set(tag.category, categoryFilter);
    }

    for (const [category, categoryFilter] of tagsByCategory.entries()) {
      items = items.filter((motorcycle) => {
        const matchesTag = motorcycle.tags.some((tag) => categoryFilter.tagIds.has(tag.id));
        if (matchesTag) {
          return true;
        }
        return categoryFilter.matchMissing && hasNoCategoryData(motorcycle, category);
      });
    }
  }

  const sortedItems = sortMotorcycles(items, searchParams.get("sort"));
  const total = sortedItems.length;
  const limit = Math.max(0, toFiniteNumber(searchParams.get("limit"), 20));
  const offset = Math.max(0, toFiniteNumber(searchParams.get("offset"), 0));

  return {
    items: sortedItems.slice(offset, offset + limit),
    total,
  };
}

async function loadStaticCatalogData() {
  if (!staticCatalogPromise) {
    staticCatalogPromise = fetch(STATIC_DATA_URL).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Static data error: ${response.status}`);
      }
      return response.json() as Promise<StaticCatalogData>;
    });
  }

  return staticCatalogPromise;
}

export async function fetchStaticCatalogJson<T>(path: string): Promise<T> {
  const data = await loadStaticCatalogData();
  const catalogTags = getCatalogTags(data);
  const url = new URL(path, "https://static.moto-catalog.local");

  if (url.pathname === "/motorcycles/tags/all") {
    const category = url.searchParams.get("category");
    const tags = category
      ? catalogTags.filter((tag) => tag.category === category)
      : catalogTags;
    return tags as T;
  }

  if (url.pathname === "/motorcycles") {
    return filterMotorcycles(data, url.searchParams) as T;
  }

  if (url.pathname.startsWith("/motorcycles/")) {
    const id = Number(url.pathname.replace("/motorcycles/", ""));
    if (!Number.isInteger(id)) {
      throw new Error(`Unsupported static path: ${path}`);
    }

    const motorcycle = data.motorcycles.find((candidate) => candidate.id === id);
    if (!motorcycle) {
      throw new Error(`Static motorcycle not found: ${id}`);
    }

    return motorcycle as T;
  }

  throw new Error(`Unsupported static path: ${path}`);
}
