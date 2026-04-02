import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "./queryClient";
import { type BaseHorse, getHorseImage, VALID_HORSES } from "./horses";
import { STATION_IDS, ALL_STATION_IDS, type StationId } from "./crafts";

export type { BaseHorse };
export type Language = "en" | "ar";

interface JourneyContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  participantId: string | null;
  setParticipantId: (id: string | null) => void;
  isGuest: boolean;
  baseHorse: BaseHorse;
  setBaseHorse: (horse: BaseHorse) => void;
  horseName: string;
  setHorseName: (name: string) => void;
  customizations: Record<string, string>;
  setCustomization: (stationId: string, optionId: string) => void;
  points: number;
  addPoints: (amount: number) => void;
  unlockedStations: string[];
  unlockStation: (stationId: string, unlockToken?: string) => void;
  getBaseHorseImage: () => string;
  markCaptured: () => void;
  markShared: () => void;
  resetJourney: () => void;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

const DEFAULT_OPTION_FOR_STATION: Record<string, string> = {
  talli: "gold",
  sadu: "red",
  saddle: "dark",
  pottery: "terra",
  silk: "blue",
  alkhous: "natural",
};

const VALID_OPTION_IDS = new Set([
  "gold", "silver", "red", "black", "dark", "tan",
  "terra", "cobalt", "blue", "emerald", "natural", "dyed",
]);

function normalizeCustomizations(raw: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [stationId, optionId] of Object.entries(raw)) {
    if (DEFAULT_OPTION_FOR_STATION[stationId]) {
      if (VALID_OPTION_IDS.has(optionId)) {
        result[stationId] = optionId;
      } else {
        result[stationId] = DEFAULT_OPTION_FOR_STATION[stationId];
      }
    }
  }
  return result;
}

function deserializeCustomizations(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const result: Record<string, string> = {};
      for (const item of parsed) {
        if (typeof item === "string" && DEFAULT_OPTION_FOR_STATION[item]) {
          result[item] = DEFAULT_OPTION_FOR_STATION[item];
        }
      }
      return result;
    }
    if (typeof parsed === "object" && parsed !== null) {
      return normalizeCustomizations(parsed as Record<string, string>);
    }
    return {};
  } catch {
    return {};
  }
}

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("language") as Language) || "en";
  });

  const [participantId, setParticipantIdState] = useState<string | null>(() => {
    return localStorage.getItem("participantId");
  });

  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem("isGuest") === "true";
  });

  const [baseHorse, setBaseHorseState] = useState<BaseHorse>(() => {
    const saved = localStorage.getItem("baseHorse") as BaseHorse;
    return VALID_HORSES.includes(saved) ? saved : "rebels_romance";
  });

  const [horseName, setHorseNameState] = useState<string>(() => {
    return localStorage.getItem("horseName") || "";
  });

  const [customizations, setCustomizations] = useState<Record<string, string>>(() => {
    return deserializeCustomizations(localStorage.getItem("customizations"));
  });

  const [points, setPoints] = useState(() => {
    return Number(localStorage.getItem("points")) || 0;
  });

  const ALL_STATIONS = ALL_STATION_IDS as readonly string[];
  const [unlockedStations, setUnlockedStations] = useState<string[]>(() => {
    const saved = localStorage.getItem("unlockedStations");
    const parsed = saved ? JSON.parse(saved) : [];
    const merged = Array.from(new Set([...ALL_STATIONS, ...parsed]));
    return merged;
  });

  const { i18n } = useTranslation();

  const setParticipantId = useCallback((id: string | null) => {
    setParticipantIdState(id);
    if (id) {
      localStorage.setItem("participantId", id);
    } else {
      localStorage.removeItem("participantId");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("language", language);
    i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    localStorage.setItem("baseHorse", baseHorse);
  }, [baseHorse]);

  useEffect(() => {
    localStorage.setItem("horseName", horseName);
  }, [horseName]);

  useEffect(() => {
    localStorage.setItem("customizations", JSON.stringify(customizations));
  }, [customizations]);

  useEffect(() => {
    localStorage.setItem("points", points.toString());
  }, [points]);

  useEffect(() => {
    localStorage.setItem("unlockedStations", JSON.stringify(unlockedStations));
  }, [unlockedStations]);

  useEffect(() => {
    if (!participantId) return;
    apiRequest("GET", `/api/participants/${participantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.baseHorse && VALID_HORSES.includes(data.baseHorse)) {
          setBaseHorseState(data.baseHorse as BaseHorse);
        }
        if (data.customizations) {
          if (Array.isArray(data.customizations)) {
            const migrated: Record<string, string> = {};
            for (const item of data.customizations) {
              if (typeof item === "string" && DEFAULT_OPTION_FOR_STATION[item]) {
                migrated[item] = DEFAULT_OPTION_FOR_STATION[item];
              }
            }
            setCustomizations(migrated);
          } else if (typeof data.customizations === "object") {
            setCustomizations(normalizeCustomizations(data.customizations));
          }
        }
        if (data.points) setPoints(data.points);
        if (data.unlockedStations) setUnlockedStations(data.unlockedStations);
        setIsGuest(!!data.isGuest);
        localStorage.setItem("isGuest", data.isGuest ? "true" : "false");
      })
      .catch(() => {});
  }, [participantId]);

  const setHorseName = useCallback((name: string) => {
    setHorseNameState(name);
  }, []);

  const setBaseHorse = useCallback((horse: BaseHorse) => {
    setBaseHorseState(horse);
    if (participantId) {
      apiRequest("PATCH", `/api/participants/${participantId}/horse`, { baseHorse: horse }).catch(() => {});
    }
  }, [participantId]);

  const setCustomization = useCallback((stationId: string, optionId: string) => {
    setCustomizations(prev => ({ ...prev, [stationId]: optionId }));
    if (participantId) {
      apiRequest("PATCH", `/api/participants/${participantId}/customize`, { stationId, optionId }).catch(() => {});
    }
  }, [participantId]);

  const addPoints = useCallback((amount: number) => {
    setPoints(prev => prev + amount);
  }, []);

  const unlockStation = useCallback((stationId: string, unlockToken?: string) => {
    setUnlockedStations(prev => {
      if (!prev.includes(stationId)) {
        return [...prev, stationId];
      }
      return prev;
    });
    if (participantId && unlockToken) {
      apiRequest("PATCH", `/api/participants/${participantId}/unlock`, { stationId, unlockToken }).catch(() => {});
    }
  }, [participantId]);

  const markCaptured = useCallback(() => {
    if (participantId) {
      apiRequest("PATCH", `/api/participants/${participantId}/capture`).catch(() => {});
    }
  }, [participantId]);

  const markShared = useCallback(() => {
    if (participantId) {
      apiRequest("PATCH", `/api/participants/${participantId}/share`).catch(() => {});
    }
  }, [participantId]);

  const resetJourney = useCallback(() => {
    setParticipantId(null);
    setBaseHorseState("rebels_romance");
    setHorseNameState("");
    setCustomizations({});
    setPoints(0);
    setUnlockedStations([]);
    localStorage.removeItem("participantId");
    localStorage.removeItem("baseHorse");
    localStorage.removeItem("horseName");
    localStorage.removeItem("customizations");
    localStorage.removeItem("points");
    localStorage.removeItem("unlockedStations");
  }, [setParticipantId]);

  const getBaseHorseImageFn = () => {
    return getHorseImage(baseHorse);
  };

  return (
    <JourneyContext.Provider value={{
      language, setLanguage,
      participantId, setParticipantId,
      isGuest,
      baseHorse, setBaseHorse,
      horseName, setHorseName,
      customizations, setCustomization,
      points, addPoints,
      unlockedStations, unlockStation,
      getBaseHorseImage: getBaseHorseImageFn,
      markCaptured, markShared, resetJourney
    }}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={language === 'ar' ? 'font-arabic' : ''}>
        {children}
      </div>
    </JourneyContext.Provider>
  );
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (context === undefined) {
    throw new Error("useJourney must be used within a JourneyProvider");
  }
  return context;
}
