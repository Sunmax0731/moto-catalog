import type { Motorcycle, Tag } from "./types";

const NO_DATA_TAG_LABEL = "\u30c7\u30fc\u30bf\u306a\u3057";
const NO_DATA_TAG_BASE_ID = 1_000;
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
    label: "\u65e5\u672c\uff08\u56fd\u7523\uff09",
    makers: ["HONDA", "YAMAHA", "SUZUKI", "KAWASAKI"],
  },
  {
    key: "america",
    label: "\u30a2\u30e1\u30ea\u30ab",
    makers: ["Harley-Davidson", "Indian", "Buell", "Victory"],
  },
  {
    key: "italy",
    label: "\u30a4\u30bf\u30ea\u30a2",
    makers: ["Aprilia", "Benelli", "Beta", "Bimota", "Ducati", "Moto Guzzi", "MV Agusta", "PIAGGIO", "SWM", "Vespa"],
  },
  {
    key: "uk",
    label: "\u30a4\u30ae\u30ea\u30b9",
    makers: ["Triumph"],
  },
  {
    key: "germany",
    label: "\u30c9\u30a4\u30c4",
    makers: ["BMW"],
  },
  {
    key: "austria",
    label: "\u30aa\u30fc\u30b9\u30c8\u30ea\u30a2",
    makers: ["KTM"],
  },
  {
    key: "sweden",
    label: "\u30b9\u30a6\u30a7\u30fc\u30c7\u30f3",
    makers: ["Husqvarna"],
  },
  {
    key: "spain",
    label: "\u30b9\u30da\u30a4\u30f3",
    makers: ["GASGAS"],
  },
  {
    key: "france",
    label: "\u30d5\u30e9\u30f3\u30b9",
    makers: ["Sherco"],
  },
  {
    key: "india",
    label: "\u30a4\u30f3\u30c9",
    makers: ["Royal Enfield"],
  },
  {
    key: "taiwan",
    label: "\u53f0\u6e7e",
    makers: ["KYMCO"],
  },
  {
    key: "russia",
    label: "\u30ed\u30b7\u30a2",
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

export function getNoDataTagLabel() {
  return NO_DATA_TAG_LABEL;
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

export function buildNoDataTags(tags: Tag[], motorcycles: Motorcycle[]): Tag[] {
  const categories = [...new Set(tags.map((tag) => tag.category))];
  return categories.flatMap((category) => {
    const hasMissingData = motorcycles.some(
      (motorcycle) => !motorcycle.tags.some((tag) => tag.category === category)
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
      label: "\u305d\u306e\u4ed6",
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
