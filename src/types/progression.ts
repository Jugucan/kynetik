// ============================================================
// TIPUS DEL SISTEMA DE PROGRESSIÓ (XP, NIVELL, RATXA)
// ============================================================

export type ProgressionLevel =
  | 'principiant'
  | 'atleta'
  | 'competidora'
  | 'campiona'
  | 'elit'
  | 'llegenda';

export interface LevelDefinition {
  id: ProgressionLevel;
  name: string;
  emoji: string;
  minClasses: number;
  maxClasses: number | null; // null = sense límit
  color: string;
  bgGradient: string;
  description: string;
}

export interface WeekStreak {
  current: number;      // Ratxa actual en setmanes
  best: number;         // Millor ratxa històrica
  isActiveThisWeek: boolean; // Ha vingut aquesta setmana?
  lastActiveWeek: string;    // Clau de l'última setmana activa (YYYY-Www)
}

export interface XPInfo {
  total: number;        // XP totals acumulats (mai baixen)
  available: number;    // XP disponibles per gastar (total - gastats)
  level: number;        // Nivell XP actual (1, 2, 3...)
  currentLevelXP: number;   // XP dins del nivell actual
  nextLevelXP: number;      // XP necessaris per pujar de nivell
  progressPercent: number;  // % de progrés cap al següent nivell
}

export interface ProgressionData {
  level: LevelDefinition;
  streak: WeekStreak;
  xp: XPInfo;
  totalClasses: number;
  classesUntilNextLevel: number | null;
}

// ============================================================
// DEFINICIÓ DELS NIVELLS
// ============================================================

export const LEVELS: LevelDefinition[] = [
  {
    id: 'principiant',
    name: 'Principiant',
    emoji: '🌱',
    minClasses: 0,
    maxClasses: 9,
    color: 'text-green-600',
    bgGradient: 'from-green-50 to-emerald-100',
    description: 'Acabes de començar. Cada pas compta!',
  },
  {
    id: 'atleta',
    name: 'Atleta',
    emoji: '⚡',
    minClasses: 10,
    maxClasses: 24,
    color: 'text-blue-600',
    bgGradient: 'from-blue-50 to-cyan-100',
    description: 'Ja tens el ritme. Segueix endavant!',
  },
  {
    id: 'competidora',
    name: 'Competidora',
    emoji: '🔥',
    minClasses: 25,
    maxClasses: 49,
    color: 'text-orange-600',
    bgGradient: 'from-orange-50 to-amber-100',
    description: 'La teva dedicació és admirable!',
  },
  {
    id: 'campiona',
    name: 'Campiona',
    emoji: '🏆',
    minClasses: 50,
    maxClasses: 99,
    color: 'text-yellow-600',
    bgGradient: 'from-yellow-50 to-amber-100',
    description: 'Ets una campiona del Kynetik!',
  },
  {
    id: 'elit',
    name: 'Èlit',
    emoji: '💎',
    minClasses: 100,
    maxClasses: 199,
    color: 'text-cyan-600',
    bgGradient: 'from-cyan-50 to-blue-100',
    description: 'Formes part de l\'èlit esportiva!',
  },
  {
    id: 'llegenda',
    name: 'Llegenda',
    emoji: '👑',
    minClasses: 200,
    maxClasses: null,
    color: 'text-purple-600',
    bgGradient: 'from-purple-50 to-pink-100',
    description: 'Ets una llegenda del Kynetik!',
  },
];

// XP per nivell XP (no confondre amb nivell de classes)
// Cada nivell XP requereix més XP que l'anterior
export const XP_LEVEL_THRESHOLDS = [
  0,    // Nivell 1: 0 XP
  100,  // Nivell 2: 100 XP
  250,  // Nivell 3: 250 XP
  500,  // Nivell 4: 500 XP
  900,  // Nivell 5: 900 XP
  1400, // Nivell 6: 1400 XP
  2000, // Nivell 7: 2000 XP
  2800, // Nivell 8: 2800 XP
  3800, // Nivell 9: 3800 XP
  5000, // Nivell 10: 5000 XP
];
