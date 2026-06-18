// ============================================================
// TIPUS DEL SISTEMA DE PROGRESSIÓ (XP, NIVELL, RATXA)
// ============================================================

export type ProgressionLevel =
  | 'principiant'
  | 'actiu'
  | 'compromis'
  | 'determinat'
  | 'imparable'
  | 'elit'
  | 'llegenda';

export interface LevelDefinition {
  id: ProgressionLevel;
  name: string;
  nameFemeni: string;
  nameMasculi: string;
  emoji: string;
  minXP: number;
  maxXP: number | null;
  color: string;
  bgGradient: string;
  description: string;
}

export interface WeekStreak {
  current: number;
  best: number;
  isActiveThisWeek: boolean;
  lastActiveWeek: string;
}

export interface XPInfo {
  total: number;
  available: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
}

export interface ProgressionData {
  level: LevelDefinition;
  streak: WeekStreak;
  xp: XPInfo;
  totalClasses: number;
  xpUntilNextLevel: number | null;
}

// ============================================================
// NIVELLS BASATS EN XP
// ============================================================

export const LEVELS: LevelDefinition[] = [
  {
    id: 'principiant',
    name: 'Principiant',
    nameFemeni: 'Principiant',
    nameMasculi: 'Principiant',
    emoji: '🌱',
    minXP: 0,
    maxXP: 199,
    color: 'text-green-600',
    bgGradient: 'from-green-50 to-emerald-100',
    description: 'Acabes de començar. Cada pas compta!',
  },
  {
    id: 'actiu',
    name: 'Actiu/va',
    nameFemeni: 'Activa',
    nameMasculi: 'Actiu',
    emoji: '⚡',
    minXP: 200,
    maxXP: 599,
    color: 'text-blue-600',
    bgGradient: 'from-blue-50 to-cyan-100',
    description: 'Ja tens el ritme. Segueix endavant!',
  },
  {
    id: 'compromis',
    name: 'Compromès/a',
    nameFemeni: 'Compromesa',
    nameMasculi: 'Compromès',
    emoji: '🔥',
    minXP: 600,
    maxXP: 1199,
    color: 'text-orange-600',
    bgGradient: 'from-orange-50 to-amber-100',
    description: 'La teva dedicació és admirable!',
  },
  {
    id: 'determinat',
    name: 'Determinat/da',
    nameFemeni: 'Determinada',
    nameMasculi: 'Determinat',
    emoji: '💪',
    minXP: 1200,
    maxXP: 1999,
    color: 'text-amber-600',
    bgGradient: 'from-amber-50 to-yellow-100',
    description: 'Res no et para quan et proposes una cosa.',
  },
  {
    id: 'imparable',
    name: 'Imparable',
    nameFemeni: 'Imparable',
    nameMasculi: 'Imparable',
    emoji: '🚀',
    minXP: 2000,
    maxXP: 3499,
    color: 'text-purple-600',
    bgGradient: 'from-purple-50 to-violet-100',
    description: 'Estàs en un nivell que pocs assoleixen.',
  },
  {
    id: 'elit',
    name: 'Èlit',
    nameFemeni: 'Èlit',
    nameMasculi: 'Èlit',
    emoji: '💎',
    minXP: 3500,
    maxXP: 5999,
    color: 'text-cyan-600',
    bgGradient: 'from-cyan-50 to-blue-100',
    description: 'Formes part de l\'èlit esportiva del Kynetik!',
  },
  {
    id: 'llegenda',
    name: 'Icona del Kynetik',
    nameFemeni: 'Icona del Kynetik',
    nameMasculi: 'Icona del Kynetik',
    emoji: '👑',
    minXP: 6000,
    maxXP: null,
    color: 'text-purple-700',
    bgGradient: 'from-purple-100 to-pink-100',
    description: 'Ets la icona absoluta del Kynetik.',
  },
];

// XP per nivell de subprogrés (barra interna)
export const XP_LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000,
];
