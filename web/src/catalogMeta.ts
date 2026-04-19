import type { Motorcycle, Tag } from "./types";

const NO_DATA_TAG_LABEL = "データなし";
const NO_DATA_TAG_BASE_ID = 1_000;
const ELECTRIC_TAG_LABEL = "電気バイク";
const ELECTRIC_TAG_CATEGORY = "type";
const ELECTRIC_TAG_ID = -2_000;
const NO_DATA_CATEGORY_ORDER = [
  "maker",
  "type",
  "usage",
  "luggage",
  "riding_position",
  "transmission",
  "cooling",
  "engine_layout",
  "cylinders",
  "valves_per_cylinder",
  "fuel_system",
  "frame",
  "suspension",
  "clutch",
  "drive",
  "abs",
  "start",
  "traction_control",
  "riding_mode",
  "quickshifter",
  "meter_type",
] as const;

const NO_DATA_CATEGORY_INDEX = new Map<string, number>(
  NO_DATA_CATEGORY_ORDER.map((category, index) => [category, index])
);

const MAKER_GROUPS: Array<{ key: string; label: string; makers: string[] }> = [
  {
    key: "japan",
    label: "日本（国産）",
    makers: ["HONDA", "YAMAHA", "SUZUKI", "KAWASAKI"],
  },
  {
    key: "america",
    label: "アメリカ",
    makers: ["Harley-Davidson", "Indian", "Buell", "Victory"],
  },
  {
    key: "italy",
    label: "イタリア",
    makers: ["Aprilia", "Benelli", "Beta", "Bimota", "Ducati", "Moto Guzzi", "MV Agusta", "PIAGGIO", "SWM", "Vespa"],
  },
  {
    key: "uk",
    label: "イギリス",
    makers: ["Triumph"],
  },
  {
    key: "germany",
    label: "ドイツ",
    makers: ["BMW"],
  },
  {
    key: "austria",
    label: "オーストリア",
    makers: ["KTM"],
  },
  {
    key: "sweden",
    label: "スウェーデン",
    makers: ["Husqvarna"],
  },
  {
    key: "spain",
    label: "スペイン",
    makers: ["GASGAS"],
  },
  {
    key: "france",
    label: "フランス",
    makers: ["Sherco"],
  },
  {
    key: "india",
    label: "インド",
    makers: ["Royal Enfield"],
  },
  {
    key: "taiwan",
    label: "台湾",
    makers: ["KYMCO"],
  },
  {
    key: "russia",
    label: "ロシア",
    makers: ["Ural"],
  },
];

export type MakerTagGroup = {
  key: string;
  label: string;
  tags: Tag[];
};

export type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

function getFallbackNoDataTagId(category: string) {
  let hash = 0;
  for (const char of category) {
    hash = (hash * 31 + char.charCodeAt(0)) % 10_000;
  }
  return -(NO_DATA_TAG_BASE_ID + NO_DATA_CATEGORY_ORDER.length + hash);
}

function getRange(start: number, end: number) {
  const items: number[] = [];
  for (let current = start; current <= end; current += 1) {
    items.push(current);
  }
  return items;
}

function hasCategoryData(motorcycle: Motorcycle, category: string) {
  if (motorcycle.tags.some((tag) => tag.category === category)) {
    return true;
  }
  return category === ELECTRIC_TAG_CATEGORY && motorcycle.displacement === 0;
}

function findElectricTag(tags: Tag[]) {
  return tags.find((tag) => isElectricTag(tag)) ?? null;
}

export function getNoDataTagLabel() {
  return NO_DATA_TAG_LABEL;
}

export function getElectricTagLabel() {
  return ELECTRIC_TAG_LABEL;
}

export function getNoDataTagId(category: string) {
  const index = NO_DATA_CATEGORY_INDEX.get(category);
  if (index == null) {
    return getFallbackNoDataTagId(category);
  }
  return -(NO_DATA_TAG_BASE_ID + index);
}

export function isNoDataTag(tag: Pick<Tag, "id" | "name">) {
  return tag.id < 0 && tag.name === NO_DATA_TAG_LABEL;
}

export function isElectricTag(tag: Pick<Tag, "name" | "category">) {
  return tag.category === ELECTRIC_TAG_CATEGORY && tag.name === ELECTRIC_TAG_LABEL;
}

export function getElectricTag(tags: Tag[] = []): Tag {
  return (
    findElectricTag(tags) ?? {
      id: ELECTRIC_TAG_ID,
      name: ELECTRIC_TAG_LABEL,
      category: ELECTRIC_TAG_CATEGORY,
    }
  );
}

export function withElectricCatalogData(tags: Tag[], motorcycles: Motorcycle[]) {
  const shouldAddElectricTag = motorcycles.some(
    (motorcycle) => motorcycle.displacement === 0 || motorcycle.tags.some((tag) => isElectricTag(tag))
  );

  if (!shouldAddElectricTag) {
    return { tags, motorcycles };
  }

  const electricTag = getElectricTag(tags);
  const nextTags = findElectricTag(tags) ? tags : [...tags, electricTag];
  const nextMotorcycles = motorcycles.map((motorcycle) => {
    if (motorcycle.displacement !== 0 || motorcycle.tags.some((tag) => isElectricTag(tag))) {
      return motorcycle;
    }
    return {
      ...motorcycle,
      tags: [...motorcycle.tags, electricTag],
    };
  });

  return {
    tags: nextTags,
    motorcycles: nextMotorcycles,
  };
}

export function buildNoDataTags(tags: Tag[], motorcycles: Motorcycle[]): Tag[] {
  const categories = [...new Set(tags.map((tag) => tag.category))];
  return categories.flatMap((category) => {
    const hasMissingData = motorcycles.some(
      (motorcycle) => !hasCategoryData(motorcycle, category)
    );
    if (!hasMissingData) {
      return [];
    }
    return [
      {
        id: getNoDataTagId(category),
        name: NO_DATA_TAG_LABEL,
        category,
      },
    ];
  });
}

export function groupMakerTags(tags: Tag[]): MakerTagGroup[] {
  const assignedTagIds = new Set<number>();
  const groups = MAKER_GROUPS.map((group) => {
    const groupedTags = tags.filter((tag) => group.makers.includes(tag.name));
    groupedTags.forEach((tag) => assignedTagIds.add(tag.id));
    return {
      key: group.key,
      label: group.label,
      tags: groupedTags,
    };
  }).filter((group) => group.tags.length > 0);

  const otherTags = tags.filter((tag) => !assignedTagIds.has(tag.id));
  if (otherTags.length > 0) {
    groups.push({
      key: "other",
      label: "その他",
      tags: otherTags,
    });
  }

  return groups;
}

export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): PaginationItem[] {
  if (totalPages <= 7) {
    return getRange(1, totalPages);
  }

  const leftSiblingPage = Math.max(currentPage - siblingCount, 2);
  const rightSiblingPage = Math.min(currentPage + siblingCount, totalPages - 1);
  const showLeftEllipsis = leftSiblingPage > 2;
  const showRightEllipsis = rightSiblingPage < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = getRange(1, 3 + siblingCount * 2);
    return [...leftRange, "ellipsis-right", totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = getRange(totalPages - (2 + siblingCount * 2), totalPages);
    return [1, "ellipsis-left", ...rightRange];
  }

  const middleRange = getRange(leftSiblingPage, rightSiblingPage);
  return [1, "ellipsis-left", ...middleRange, "ellipsis-right", totalPages];
}
