// FIX: Removed extraneous lines from the top of the file that were causing parsing errors.
// Main hero ranking and priority data sheet.
import type { FurniturePriority, FurniturePriorityTier } from './types';

export const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/14JyRBKyw6tKKtb_fYpxVJWOpaN6g28TilJXLTpQQY50/export?format=tsv';

// Translation sheet for hero names.
export const TRANSLATION_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1PjMiR6A3B6FueLJWZ3C_oRc88F84sEcCb3rMW_QaGNE/export?format=tsv&gid=1474701905';

// URL for the guild's external website.
export const GUILD_URL = 'https://sites.google.com/view/afk-hispania';

// Mapping from tier names found in the sheet to display names.
export const TIER_MAP: { [key: string]: string } = {
  "SSS": "SSS",
  "SS": "SS",
  "S": "S",
  "A": "A",
  "B": "B",
  "C": "C",
  "D": "D",
};

// Order for sorting priority groups. Lower number is higher priority.
export const GROUP_ORDER: { [key: string]: number } = { 
  "SSS": 1, 
  "SS": 2, 
  "S": 3, 
  "A": 4, 
  "B": 5, 
  "C": 6, 
  "D": 7 
};

// Mapping for engraving nodes, from Russian abbreviations/names to Spanish.
export const NODE_TRANSLATION_MAP: { [key: string]: string } = {
    // Abbreviations
    "УСК": "VEL",
    "МУ": "PM",
    "ОЗ": "PS",
    "СА": "VA",
    "ЗЩТ": "DEF",
    "ФУ": "PF",
    "БКУ": "RDC",
    "УКУ": "CDA",
    "КРИТ": "Crit",
    "ИНТ": "PER",
    "MTK": "PRE", // Latin
    "МТК": "PRE", // Cyrillic
    "ATK": "ATK", // Latin
    "АТК": "ATK", // Cyrillic
    // Full names
    "Крит": "Crit",
    "Физ. пробитие": "PP",
    "Маг. пробитие": "PM",
};

export const SUGGESTION_ORDER: { level: number, tier: FurniturePriorityTier }[] = [
  { level: 1, tier: 'TOP TIER' }, { level: 1, tier: 'VERY GOOD' }, { level: 3, tier: 'TOP TIER' },
  { level: 1, tier: 'GOOD' }, { level: 2, tier: 'VERY GOOD' }, { level: 3, tier: 'VERY GOOD' },
  { level: 2, tier: 'GOOD' }, { level: 1, tier: 'AVERAGE' }, { level: 3, tier: 'GOOD' },
  { level: 2, tier: 'AVERAGE' }, { level: 3, tier: 'AVERAGE' }, { level: 1, tier: 'BAD' },
  { level: 1, tier: 'VERY BAD' }, { level: 3, tier: 'BAD' }, { level: 3, tier: 'VERY BAD' },
];

export const DEFAULT_FURNITURE_PRIORITIES: Record<string, FurniturePriority> = {
  "Zohra": { "top": "GOOD", "middle": "VERY GOOD", "bottom": "GOOD" },
  "Lysander": { "top": "BAD", "middle": "AVERAGE", "bottom": "VERY GOOD" },
  "Knox": { "top": "AVERAGE", "middle": "BAD", "bottom": "VERY GOOD" },
  "Envydiel": { "top": "VERY GOOD", "middle": "TOP TIER", "bottom": "VERY GOOD" },
  "Alvida": { "top": "GOOD", "middle": "GOOD", "bottom": "BAD" },
  "AEstrilda": { "top": "VERY GOOD", "middle": "VERY GOOD", "bottom": "AVERAGE" },
  "Gorren": { "top": "BAD", "middle": "BAD", "bottom": "BAD" },
  "Randle": { "top": "VERY BAD", "middle": "BAD", "bottom": "VERY BAD" },
  "AThoran": { "top": "VERY GOOD", "middle": "AVERAGE", "bottom": "GOOD" },
  "Mira": { "top": "BAD", "middle": "BAD", "bottom": "GOOD" },
  "Skylan": { "top": "VERY GOOD", "middle": "VERY GOOD", "bottom": "BAD" },
  "Sion": { "top": "VERY GOOD", "middle": "TOP TIER", "bottom": "VERY GOOD" },
  "Haelia": { "top": "AVERAGE", "middle": "GOOD", "bottom": "AVERAGE" },
  "Velufira": { "top": "AVERAGE", "middle": "AVERAGE", "bottom": "AVERAGE" },
  "Leviathan": { "top": "VERY GOOD", "middle": "VERY GOOD", "bottom": "TOP TIER" },
  "Shalltear": { "top": "AVERAGE", "middle": "AVERAGE", "bottom": "AVERAGE" },
  "Laios": { "top": "VERY GOOD", "middle": "BAD", "bottom": "VERY BAD" },
  "Marcille": { "top": "GOOD", "middle": "GOOD", "bottom": "VERY GOOD" },
  "ALyca": { "top": "GOOD", "middle": "VERY GOOD", "bottom": "AVERAGE" },
  "ASolise": { "top": "VERY BAD", "middle": "VERY BAD", "bottom": "VERY BAD" },
  "Atheus": { "top": "VERY GOOD", "middle": "BAD", "bottom": "BAD" },
  "Misha": { "top": "BAD", "middle": "VERY GOOD", "bottom": "TOP TIER" },
  "Tamrus": { "top": "VERY BAD", "middle": "VERY BAD", "bottom": "AVERAGE" },
  "Trishea": { "top": "GOOD", "middle": "BAD", "bottom": "GOOD" },
  "ABaden": { "top": "VERY BAD", "middle": "VERY BAD", "bottom": "BAD" },
  "AShemira": { "top": "VERY GOOD", "middle": "AVERAGE", "bottom": "BAD" },
  "Ivan": { "top": "GOOD", "middle": "GOOD", "bottom": "GOOD" },
  "DGwyneth": { "top": "AVERAGE", "middle": "VERY BAD", "bottom": "BAD" },
  "Hildwin": { "top": "AVERAGE", "middle": "BAD", "bottom": "BAD" },
  "Lan": { "top": "GOOD", "middle": "VERY GOOD", "bottom": "AVERAGE" },
  "Kregor": { "top": "AVERAGE", "middle": "AVERAGE", "bottom": "BAD" },
  "Melion": { "top": "BAD", "middle": "AVERAGE", "bottom": "GOOD" },
  "Nyla": { "top": "GOOD", "middle": "BAD", "bottom": "BAD" },
  "Emilia": { "top": "VERY BAD", "middle": "AVERAGE", "bottom": "VERY BAD" },
  "Rem": { "top": "BAD", "middle": "AVERAGE", "bottom": "GOOD" },
  "Rimuru": { "top": "VERY BAD", "middle": "VERY BAD", "bottom": "VERY BAD" },
  "Shuna": { "top": "GOOD", "middle": "BAD", "bottom": "BAD" },
  "AAthalia": { "top": "GOOD", "middle": "VERY GOOD", "bottom": "TOP TIER" },
  "Gavus": { "top": "GOOD", "middle": "AVERAGE", "bottom": "AVERAGE" },
  "Aurelia": { "top": "AVERAGE", "middle": "GOOD", "bottom": "BAD" },
  "Alna": { "top": "VERY BAD", "middle": "VERY BAD", "bottom": "GOOD" },
  "Daemia": { "top": "AVERAGE", "middle": "GOOD", "bottom": "VERY GOOD" },
  "Liberta": { "top": "AVERAGE", "middle": "VERY GOOD", "bottom": "VERY GOOD" },
  "Veithael": { "top": "BAD", "middle": "VERY BAD", "bottom": "BAD" },
  "Eugene": { "top": "BAD", "middle": "VERY BAD", "bottom": "BAD" },
  "Maetria": { "top": "GOOD", "middle": "AVERAGE", "bottom": "AVERAGE" },
  "Kalthin": { "top": "VERY BAD", "middle": "BAD", "bottom": "BAD" },
  "Lavatune": { "top": "GOOD", "middle": "TOP TIER", "bottom": "AVERAGE" },
  "Lucilla": { "top": "AVERAGE", "middle": "AVERAGE", "bottom": "GOOD" },
  "ABelinda": { "top": "VERY GOOD", "middle": "AVERAGE", "bottom": "GOOD" },
  "ALucius": { "top": "GOOD", "middle": "VERY GOOD", "bottom": "TOP TIER" },
  "AThane": { "top": "GOOD", "middle": "GOOD", "bottom": "VERY GOOD" },
  "Adrian & Elyse": { "top": "GOOD", "middle": "BAD", "bottom": "VERY GOOD" },
  "Jerome": { "top": "AVERAGE", "middle": "VERY GOOD", "bottom": "GOOD" },
  "Palmer": { "top": "TOP TIER", "middle": "GOOD", "bottom": "VERY GOOD" },
  "Rosaline": { "top": "BAD", "middle": "BAD", "bottom": "BAD" },
  "AAntandra": { "top": "BAD", "middle": "AVERAGE", "bottom": "BAD" },
  "ABrutus": { "top": "BAD", "middle": "VERY BAD", "bottom": "VERY BAD" },
  "ASafiya": { "top": "VERY GOOD", "middle": "BAD", "bottom": "VERY GOOD" },
  "Naroko": { "top": "VERY BAD", "middle": "AVERAGE", "bottom": "VERY BAD" },
  "Villanelle": { "top": "AVERAGE", "middle": "VERY BAD", "bottom": "VERY BAD" },
  "AEironn": { "top": "AVERAGE", "middle": "VERY GOOD", "bottom": "AVERAGE" }
};