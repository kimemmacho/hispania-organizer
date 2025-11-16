export type Page = 'landing' | 'ranking' | 'options' | 'roster' | 'priority' | 'roadmap' | 'furniture-duplicates' | 'database';

export interface Settings {
  sheetUrl: string;
  autoUpdate: boolean;
  cloudConfigured: boolean;
  showTips: boolean;
}

export interface Hero {
  faction: string;
  name: string;
  comments: string;
  tier: string;
  score: number;
  originalName: string;
  isNameTranslated: boolean;
  isFactionTranslated: boolean;
  commentIsTranslated: boolean;
  isAwakened: boolean;
}

export interface EngravingNode {
  original: string;
  translated: string;
  found: boolean;
}

export interface PriorityHero {
    originalName: string;
    name: string;
    faction: string;
    isNameTranslated: boolean;
    group: string;
    priorityComment: string;
    commentIsTranslated: boolean;
    score: number;
    requiredSI: number;
    requiredFurniture: number;
    requiredEngravings: number;
    engravingNodes: EngravingNode[];
    isAlternative: boolean; // True if this hero is from a "/" value
    isAwakened: boolean;
}

export type FurniturePriorityTier = 'TOP TIER' | 'VERY GOOD' | 'GOOD' | 'AVERAGE' | 'BAD' | 'VERY BAD' | 'NO DEFINIDO';

export interface FurniturePriority {
    top: FurniturePriorityTier;
    middle: FurniturePriorityTier;
    bottom: FurniturePriorityTier;
}

export interface PlayerHeroData {
    owned: boolean;
    si: number;
    furniture: number;
    engravings: number;
    armorTier?: number;
    furnitureDupes?: {
        top: [number, number, number];
        middle: [number, number, number];
        bottom: [number, number, number];
    }
}

export type PlayerData = Record<string, PlayerHeroData>;

// Fix: Added GroundingChunk and ChatMessage types for the ChatWidget component.
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    references?: GroundingChunk[];
}

// New type for the consolidated hero database
export interface HeroDatabaseEntry {
  key: string; // The original Russian name from the first fetch, used as a stable ID.
  
  russianName: string; // Editable, initially same as key
  spanishName: string;
  faction: string;
  isAwakened: boolean;
  isHidden?: boolean;
  
  tier: string;
  score: number;
  rankingComments: string;
  rankingCommentIsTranslated?: boolean;

  builds: Array<{
    group: string;
    priorityComment: string;
    priorityCommentIsTranslated?: boolean;
    requiredSI: number;
    requiredFurniture: number;
    requiredEngravings: number;
    engravingNodes: EngravingNode[];
    isAlternative: boolean;
  }>;
  
  portraitStatus: 'pending' | 'found' | 'missing';
  
  isUserModified?: boolean; // Flag to indicate user has changed something

  // Diffing info
  sourceData?: Partial<Omit<HeroDatabaseEntry, 'key' | 'sourceData' | 'isUserModified' | 'portraitStatus'>>; // Holds the latest fetched data for comparison
  status?: 'active' | 'removed_from_source';
}