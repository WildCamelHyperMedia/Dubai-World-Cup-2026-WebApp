export type BaseHorse =
  | "rebels_romance"
  | "meydaan"
  | "commissioner_king";

export const VALID_HORSES: BaseHorse[] = [
  "rebels_romance",
  "meydaan",
  "commissioner_king",
];

export interface HorseInfo {
  id: BaseHorse;
  nameKey: string;
  descKey: string;
  image: string;
}

export const HORSES: HorseInfo[] = [
  {
    id: "rebels_romance",
    nameKey: "horse_rebels_romance",
    descKey: "horse_rebels_romance_desc",
    image: `${import.meta.env.BASE_URL}images/horses/rebels_romance.png`,
  },
  {
    id: "meydaan",
    nameKey: "horse_meydaan",
    descKey: "horse_meydaan_desc",
    image: `${import.meta.env.BASE_URL}images/horses/meydaan.png`,
  },
  {
    id: "commissioner_king",
    nameKey: "horse_commissioner_king",
    descKey: "horse_commissioner_king_desc",
    image: `${import.meta.env.BASE_URL}images/horses/commissioner_king.png`,
  },
];

export function getHorseImage(horseId: BaseHorse): string {
  const horse = HORSES.find((h) => h.id === horseId);
  return horse?.image ?? HORSES[0].image;
}
