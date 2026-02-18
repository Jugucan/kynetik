// ============================================================
// TIPUS I DEFINICIONS DEL SISTEMA D'INSÍGNIES
// ============================================================

export type BadgeCategory =
  | 'assistencia'    // Per nombre de classes
  | 'ratxa'          // Per dies consecutius / constància
  | 'antiguitat'     // Per temps com a membre
  | 'programes'      // Per varietat de programes
  | 'exploradora'    // Per provar coses noves
  | 'especial';      // Insígnies úniques i especials

export type BadgeTier = 'bronze' | 'plata' | 'or' | 'diamant' | 'llegenda';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: BadgeCategory;
  tier: BadgeTier;
  // La condició es calcula a badgeCalculations.ts
  // Aquí només guardem la definició visual i textual
  requirement: string; // Text explicatiu del requisit
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: string; // data ISO
}

export interface BadgeWithStatus extends BadgeDefinition {
  earned: boolean;
  earnedAt?: string;
  progress?: number;     // 0-100, per mostrar barra de progrés
  progressLabel?: string; // Ex: "47 / 100 classes"
}

// ============================================================
// DEFINICIÓ DE TOTES LES INSÍGNIES
// ============================================================

export const ALL_BADGES: BadgeDefinition[] = [

  // --- ASSISTÈNCIA ---
  {
    id: 'ass_1',
    name: 'Primera Passa',
    description: 'Has assistit a la teva primera classe!',
    emoji: '👟',
    category: 'assistencia',
    tier: 'bronze',
    requirement: '1 classe',
  },
  {
    id: 'ass_5',
    name: 'Calentant Motors',
    description: 'Ja portes 5 classes. Estàs agafant el ritme!',
    emoji: '🔥',
    category: 'assistencia',
    tier: 'bronze',
    requirement: '5 classes',
  },
  {
    id: 'ass_10',
    name: 'En Marxa',
    description: '10 classes completades. Ja és un hàbit!',
    emoji: '⚡',
    category: 'assistencia',
    tier: 'bronze',
    requirement: '10 classes',
  },
  {
    id: 'ass_25',
    name: 'Compromesa',
    description: '25 classes. El compromís és real!',
    emoji: '💪',
    category: 'assistencia',
    tier: 'plata',
    requirement: '25 classes',
  },
  {
    id: 'ass_50',
    name: 'Mig Centenar',
    description: '50 classes. Ets una màquina!',
    emoji: '🏅',
    category: 'assistencia',
    tier: 'plata',
    requirement: '50 classes',
  },
  {
    id: 'ass_100',
    name: 'Centenària',
    description: '100 classes! Increïble dedicació.',
    emoji: '🥇',
    category: 'assistencia',
    tier: 'or',
    requirement: '100 classes',
  },
  {
    id: 'ass_200',
    name: 'Imparable',
    description: '200 classes. Res et para!',
    emoji: '🚀',
    category: 'assistencia',
    tier: 'or',
    requirement: '200 classes',
  },
  {
    id: 'ass_365',
    name: 'Un Any de Suor',
    description: '365 classes. Un any sencer de dedicació absoluta.',
    emoji: '🌟',
    category: 'assistencia',
    tier: 'diamant',
    requirement: '365 classes',
  },
  {
    id: 'ass_500',
    name: 'Llegendària',
    description: '500 classes. Ets una llegenda del Kynetik!',
    emoji: '👑',
    category: 'assistencia',
    tier: 'llegenda',
    requirement: '500 classes',
  },

  // --- RATXA / CONSTÀNCIA ---
  {
    id: 'ratxa_2',
    name: 'Dos Cops Seguits',
    description: 'Has vingut 2 setmanes seguides (mínim 1 cop/setmana).',
    emoji: '📅',
    category: 'ratxa',
    tier: 'bronze',
    requirement: '2 setmanes consecutives',
  },
  {
    id: 'ratxa_4',
    name: 'Un Mes Constant',
    description: '4 setmanes seguides venint. Un mes sencer!',
    emoji: '📆',
    category: 'ratxa',
    tier: 'bronze',
    requirement: '4 setmanes consecutives',
  },
  {
    id: 'ratxa_8',
    name: 'Dos Mesos de Foc',
    description: '8 setmanes sense aturar-te. Ets foc pur!',
    emoji: '🔥',
    category: 'ratxa',
    tier: 'plata',
    requirement: '8 setmanes consecutives',
  },
  {
    id: 'ratxa_12',
    name: 'Tres Mesos Invicta',
    description: 'Un trimestre sencer de constància absoluta.',
    emoji: '⚔️',
    category: 'ratxa',
    tier: 'plata',
    requirement: '12 setmanes consecutives',
  },
  {
    id: 'ratxa_26',
    name: 'Mig Any Sense Parar',
    description: '6 mesos venint setmana rere setmana. Espectacular!',
    emoji: '🏆',
    category: 'ratxa',
    tier: 'or',
    requirement: '26 setmanes consecutives',
  },
  {
    id: 'ratxa_52',
    name: 'Any Perfecte',
    description: 'Un any sencer sense perdre ni una sola setmana. Llegendari!',
    emoji: '💎',
    category: 'ratxa',
    tier: 'llegenda',
    requirement: '52 setmanes consecutives',
  },

  // --- ANTIGUITAT ---
  {
    id: 'ant_1m',
    name: 'Nouvinguda',
    description: 'Portes 1 mes amb nosaltres. Benvinguda a la família!',
    emoji: '🌱',
    category: 'antiguitat',
    tier: 'bronze',
    requirement: '1 mes com a membre',
  },
  {
    id: 'ant_3m',
    name: 'Arrelant',
    description: '3 mesos al Kynetik. Ja ets part de la família!',
    emoji: '🌿',
    category: 'antiguitat',
    tier: 'bronze',
    requirement: '3 mesos com a membre',
  },
  {
    id: 'ant_6m',
    name: 'Mig Any amb Nosaltres',
    description: '6 mesos. Ets part del Kynetik!',
    emoji: '🌳',
    category: 'antiguitat',
    tier: 'plata',
    requirement: '6 mesos com a membre',
  },
  {
    id: 'ant_1a',
    name: 'Primer Aniversari',
    description: 'Un any sencer al Kynetik. Moltes felicitats!',
    emoji: '🎂',
    category: 'antiguitat',
    tier: 'plata',
    requirement: '1 any com a membre',
  },
  {
    id: 'ant_2a',
    name: 'Dos Anys Juntes',
    description: '2 anys al Kynetik. La teva lleialtat és admirable.',
    emoji: '🎖️',
    category: 'antiguitat',
    tier: 'or',
    requirement: '2 anys com a membre',
  },
  {
    id: 'ant_3a',
    name: 'Tres Anys de Passió',
    description: '3 anys. Ets part de la història del Kynetik!',
    emoji: '🏅',
    category: 'antiguitat',
    tier: 'or',
    requirement: '3 anys com a membre',
  },
  {
    id: 'ant_5a',
    name: 'Veterana',
    description: '5 anys al Kynetik. Una veritable veterana!',
    emoji: '⭐',
    category: 'antiguitat',
    tier: 'diamant',
    requirement: '5 anys com a membre',
  },
  {
    id: 'ant_10a',
    name: 'Llegenda Kynetik',
    description: '10 anys! Ets la llegenda absoluta del Kynetik.',
    emoji: '👑',
    category: 'antiguitat',
    tier: 'llegenda',
    requirement: '10 anys com a membre',
  },

  // --- VARIETAT DE PROGRAMES ---
  {
    id: 'prog_2',
    name: 'Curiosa',
    description: 'Has provat 2 programes diferents. T\'agrada explorar!',
    emoji: '🔍',
    category: 'programes',
    tier: 'bronze',
    requirement: '2 programes diferents',
  },
  {
    id: 'prog_3',
    name: 'Versàtil',
    description: 'Tres programes a la teva llista. Genial!',
    emoji: '🎯',
    category: 'programes',
    tier: 'bronze',
    requirement: '3 programes diferents',
  },
  {
    id: 'prog_5',
    name: 'Polivalent',
    description: '5 programes. No tens por de res!',
    emoji: '🌈',
    category: 'programes',
    tier: 'plata',
    requirement: '5 programes diferents',
  },
  {
    id: 'prog_8',
    name: 'Aventurera',
    description: '8 programes diferents. Ets increïble!',
    emoji: '🦋',
    category: 'programes',
    tier: 'plata',
    requirement: '8 programes diferents',
  },
  {
    id: 'prog_10',
    name: 'Mestra de Programes',
    description: '10 programes. Ho has provat tot!',
    emoji: '🎓',
    category: 'programes',
    tier: 'or',
    requirement: '10 programes diferents',
  },
  {
    id: 'prog_15',
    name: 'Omnisport',
    description: '15 programes. No hi ha res que no puguis fer!',
    emoji: '🏆',
    category: 'programes',
    tier: 'diamant',
    requirement: '15 programes diferents',
  },

  // --- EXPLORADORA (activitats especials) ---
  {
    id: 'exp_nou',
    name: 'Ment Oberta',
    description: 'Has provat un programa nou que no coneixies.',
    emoji: '🗺️',
    category: 'exploradora',
    tier: 'bronze',
    requirement: 'Provar un programa nou',
  },
  {
    id: 'exp_centre',
    name: 'Nòmada',
    description: 'Has assistit a classes en més d\'un centre.',
    emoji: '📍',
    category: 'exploradora',
    tier: 'plata',
    requirement: 'Assistir a 2 centres diferents',
  },
  {
    id: 'exp_matidora',
    name: 'Lleva\'t Prest',
    description: 'Has assistit a una classe abans de les 9h del matí.',
    emoji: '🌅',
    category: 'exploradora',
    tier: 'bronze',
    requirement: 'Classe abans de les 9h',
  },
  {
    id: 'exp_vespre',
    name: 'Nocturna',
    description: 'Has assistit a una classe a partir de les 20h.',
    emoji: '🌙',
    category: 'exploradora',
    tier: 'bronze',
    requirement: 'Classe a les 20h o més tard',
  },
  {
    id: 'exp_5dies',
    name: 'Setmana Completa',
    description: 'Has assistit a classes en els 5 dies laborables d\'una mateixa setmana.',
    emoji: '📋',
    category: 'exploradora',
    tier: 'or',
    requirement: '5 dies en una seteixa setmana',
  },
  {
    id: 'exp_3dies_seguits',
    name: 'Tres en Ratlla',
    description: 'Has assistit 3 dies consecutius.',
    emoji: '⚡',
    category: 'exploradora',
    tier: 'plata',
    requirement: '3 dies consecutius',
  },

  // --- ESPECIALS ---
  {
    id: 'esp_comeback',
    name: 'La Gran Tornada',
    description: 'Havies estat més de 30 dies sense venir, i has tornat. Benvinguda de nou!',
    emoji: '🦅',
    category: 'especial',
    tier: 'plata',
    requirement: 'Tornar després de 30+ dies d\'absència',
  },
  {
    id: 'esp_consistent',
    name: 'Rellotge Suís',
    description: 'Has vingut exactament el mateix nombre de vegades cada mes durant 3 mesos.',
    emoji: '⏱️',
    category: 'especial',
    tier: 'or',
    requirement: 'Mateixa freqüència 3 mesos seguits',
  },
  {
    id: 'esp_any_nou',
    name: 'Any Nou, Força Nova',
    description: 'Primera classe de l\'any. Comences amb tot!',
    emoji: '🎆',
    category: 'especial',
    tier: 'bronze',
    requirement: 'Primera classe de l\'any',
  },
];

// Noms llegibles de categories
export const CATEGORY_NAMES: Record<BadgeCategory, string> = {
  assistencia: '💪 Assistència',
  ratxa: '🔥 Constància',
  antiguitat: '⭐ Antiguitat',
  programes: '🎯 Programes',
  exploradora: '🗺️ Exploradora',
  especial: '✨ Especials',
};

// Colors per tier
export const TIER_COLORS: Record<BadgeTier, { bg: string; text: string; border: string; label: string }> = {
  bronze: {
    bg: 'from-amber-100 to-orange-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    label: 'Bronze',
  },
  plata: {
    bg: 'from-slate-100 to-gray-200',
    text: 'text-slate-600',
    border: 'border-slate-300',
    label: 'Plata',
  },
  or: {
    bg: 'from-yellow-100 to-amber-200',
    text: 'text-yellow-700',
    border: 'border-yellow-400',
    label: 'Or',
  },
  diamant: {
    bg: 'from-cyan-100 to-blue-200',
    text: 'text-cyan-700',
    border: 'border-cyan-400',
    label: 'Diamant',
  },
  llegenda: {
    bg: 'from-purple-100 to-pink-200',
    text: 'text-purple-700',
    border: 'border-purple-400',
    label: 'Llegenda',
  },
};
