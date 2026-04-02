import { type BaseHorse, getHorseImage } from "./horses";
import { ALL_STATION_IDS, STATION_OPTIONS, HIDDEN_STATION_OPTIONS } from "./crafts";

export const ACCESSORY_ORDER = ALL_STATION_IDS;

const VALID_OPTIONS_BY_STATION: Record<string, Set<string>> = {};
for (const stId of ALL_STATION_IDS) {
  const opts = (STATION_OPTIONS as Record<string, {id: string}[]>)[stId]
    || HIDDEN_STATION_OPTIONS[stId];
  if (opts) {
    VALID_OPTIONS_BY_STATION[stId] = new Set(opts.map(o => o.id));
  }
}

export const getCombinedImagePath = (
  baseHorse: string,
  customizations: Record<string, string>,
  previewStationId?: string,
  previewOptionId?: string
): string => {
  const horseId = baseHorse as BaseHorse;
  const baseImage = getHorseImage(horseId);

  if (previewStationId && previewOptionId) {
    const merged: Record<string, string> = { ...customizations };
    merged[previewStationId] = previewOptionId;

    const parts: string[] = [];
    for (const stationId of ACCESSORY_ORDER) {
      const optionId = merged[stationId];
      if (optionId && VALID_OPTIONS_BY_STATION[stationId]?.has(optionId)) {
        parts.push(optionId);
      }
    }
    return parts.length === 0 ? baseImage : `/images/combos/${horseId}-${parts.join("-")}.png`;
  }

  const parts: string[] = [];
  for (const stationId of ACCESSORY_ORDER) {
    const optionId = customizations[stationId];
    if (optionId && VALID_OPTIONS_BY_STATION[stationId]?.has(optionId)) {
      parts.push(optionId);
    }
  }

  if (parts.length === 0) {
    return baseImage;
  }

  return `/images/combos/${horseId}-${parts.join("-")}.png`;
};
