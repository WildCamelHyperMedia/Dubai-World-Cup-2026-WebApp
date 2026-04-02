import craftTalli from "@/assets/images/craft-talli.png";
import craftWeaving from "@/assets/images/craft-weaving.png";
import craftLeather from "@/assets/images/craft-leather.png";
import craftPottery from "@/assets/images/craft-pottery.png";
import craftFabric from "@/assets/images/craft-fabric.png";
import craftAlkhous from "@/assets/images/craft-alkhous.png";

export const ALL_STATION_IDS = ["talli", "sadu", "saddle", "pottery", "silk", "alkhous"] as const;
export type StationId = typeof ALL_STATION_IDS[number];

export const STATION_IDS = ["talli", "sadu", "saddle", "pottery", "alkhous"] as const;
export type ActiveStationId = typeof STATION_IDS[number];
export const HIDDEN_STATIONS: StationId[] = ["silk"];
export const ACTIVE_STATION_COUNT = STATION_IDS.length;

export const HIDDEN_STATION_OPTIONS: Record<string, {id: string; label: string}[]> = {
  silk: [
    { id: "blue", label: "Blue Silk" },
    { id: "emerald", label: "Emerald Silk" },
  ],
};

export const HIDDEN_CRAFT_DATA: Record<string, {
  title: string;
  subtitle: string;
  heritageImage: string;
  heritageTitle: string;
  heritageBody: string;
  heritageTagline: string;
  chapterIntro: string;
}> = {
  silk: {
    title: "Luxury Fabric",
    subtitle: "Refined Textiles",
    heritageImage: craftFabric,
    heritageTitle: "fabric_heritage_title",
    heritageBody: "fabric_heritage_body",
    heritageTagline: "fabric_heritage_tagline",
    chapterIntro: "fabric_chapter_intro",
  },
};

export interface StationOption {
  id: string;
  label: string;
}

export const STATION_OPTIONS: Record<ActiveStationId, [StationOption, StationOption]> = {
  talli: [
    { id: "gold", label: "Gold Talli" },
    { id: "silver", label: "Silver Talli" },
  ],
  sadu: [
    { id: "red", label: "Red Sadu" },
    { id: "black", label: "Black Sadu" },
  ],
  saddle: [
    { id: "dark", label: "Dark Saddle" },
    { id: "tan", label: "Tan Saddle" },
  ],
  pottery: [
    { id: "terra", label: "Terracotta Flask" },
    { id: "cobalt", label: "Cobalt Flask" },
  ],
  alkhous: [
    { id: "natural", label: "Natural Al Khous" },
    { id: "dyed", label: "Dyed Al Khous" },
  ],
};

export const CRAFT_DATA: Record<ActiveStationId, {
  title: string;
  subtitle: string;
  heritageImage: string;
  heritageTitle: string;
  heritageBody: string;
  heritageTagline: string;
  chapterIntro: string;
}> = {
  talli: {
    title: "The Art of Talli",
    subtitle: "Emirati Heritage Craft",
    heritageImage: craftTalli,
    heritageTitle: "talli_heritage_title",
    heritageBody: "talli_heritage_body",
    heritageTagline: "talli_heritage_tagline",
    chapterIntro: "talli_chapter_intro",
  },
  sadu: {
    title: "Sadu Weaving",
    subtitle: "Bedouin Textiles",
    heritageImage: craftWeaving,
    heritageTitle: "weaving_heritage_title",
    heritageBody: "weaving_heritage_body",
    heritageTagline: "weaving_heritage_tagline",
    chapterIntro: "weaving_chapter_intro",
  },
  saddle: {
    title: "Arabian Saddle Making",
    subtitle: "Leather Craftsmanship",
    heritageImage: craftLeather,
    heritageTitle: "leather_heritage_title",
    heritageBody: "leather_heritage_body",
    heritageTagline: "leather_heritage_tagline",
    chapterIntro: "leather_chapter_intro",
  },
  pottery: {
    title: "Arabian Pottery",
    subtitle: "Clay Sculpting",
    heritageImage: craftPottery,
    heritageTitle: "pottery_heritage_title",
    heritageBody: "pottery_heritage_body",
    heritageTagline: "pottery_heritage_tagline",
    chapterIntro: "pottery_chapter_intro",
  },
  alkhous: {
    title: "Al Khous",
    subtitle: "Palm Leaf Weaving",
    heritageImage: craftAlkhous,
    heritageTitle: "alkhous_heritage_title",
    heritageBody: "alkhous_heritage_body",
    heritageTagline: "alkhous_heritage_tagline",
    chapterIntro: "alkhous_chapter_intro",
  },
};
