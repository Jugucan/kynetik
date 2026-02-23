// ============================================================
// TIPUS I DEFINICIONS DEL SISTEMA D'INSÍGNIES
// ============================================================

import { getAdjectiu } from '@/utils/genderHelpers';

export type BadgeCategory =
  | 'assistencia'
  | 'constancia'
  | 'antiguitat'
  | 'exploracio'
  | 'especial'
  | 'personal';

// Subcategories d'exploració (informatives, per mostrar a la UI)
export type ExploracioSubcategory = 'horaris' | 'varietat' | 'intensitat';

export type BadgeTier = 'bronze' | 'plata' | 'or' | 'diamant' | 'llegenda';

export interface BadgeDefinition {
  id: string;
  name: string;
  nameFemeni?: string;
  nameMasculi?: string;
  description: string;
  descriptionFemeni?: string;
  descriptionMasculi?: string;
  emoji: string;
  category: BadgeCategory;
  subcategory?: ExploracioSubcategory;
  tier: BadgeTier;
  requirement: string;
}

export interface BadgeWithStatus extends BadgeDefinition {
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  progressLabel?: string;
  unavailable?: boolean;
}

// ============================================================
// TOTES LES INSÍGNIES
// ============================================================

export const ALL_BADGES: BadgeDefinition[] = [

  // ── ASSISTÈNCIA ────────────────────────────────────────────
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
    name: 'Escalfant Motors',
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
    name: 'Compromís Real',
    nameFemeni: 'Compromesa',
    nameMasculi: 'Compromès',
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
    name: 'Centenar de Classes',
    nameFemeni: 'Centenària',
    nameMasculi: 'Centenari',
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
    id: 'ass_500',
    name: 'Llegenda del Kynetik',
    nameFemeni: 'Llegendària',
    nameMasculi: 'Llegendari',
    description: '500 classes. Ets una llegenda del Kynetik!',
    emoji: '👑',
    category: 'assistencia',
    tier: 'llegenda',
    requirement: '500 classes',
  },

  // ── CONSTÀNCIA ─────────────────────────────────────────────
  {
    id: 'ratxa_2',
    name: 'Espurna Constant',
    description: '2 setmanes seguides. L\'espurna ja crema!',
    emoji: '✨',
    category: 'constancia',
    tier: 'bronze',
    requirement: '2 setmanes consecutives',
  },
  {
    id: 'ratxa_4',
    name: 'Ritme Estable',
    description: '4 setmanes seguides. Tens un ritme estable!',
    emoji: '📆',
    category: 'constancia',
    tier: 'bronze',
    requirement: '4 setmanes consecutives',
  },
  {
    id: 'ratxa_8',
    name: 'En Foc',
    description: '8 setmanes sense aturar-te. Estàs en foc!',
    emoji: '🔥',
    category: 'constancia',
    tier: 'plata',
    requirement: '8 setmanes consecutives',
  },
  {
    id: 'ratxa_12',
    name: 'Invicte/a',
    nameFemeni: 'Invicta',
    nameMasculi: 'Invicte',
    description: 'Un trimestre sencer de constància absoluta.',
    emoji: '⚔️',
    category: 'constancia',
    tier: 'plata',
    requirement: '12 setmanes consecutives',
  },
  {
    id: 'ratxa_26',
    name: 'Mig Any Ferm',
    description: '6 mesos venint setmana rere setmana. Espectacular!',
    emoji: '🏆',
    category: 'constancia',
    tier: 'or',
    requirement: '26 setmanes consecutives',
  },
  {
    id: 'ratxa_52',
    name: 'Any Imparable',
    description: 'Un any sencer sense perdre ni una sola setmana!',
    emoji: '💎',
    category: 'constancia',
    tier: 'llegenda',
    requirement: '52 setmanes consecutives',
  },

  // ── ANTIGUITAT ─────────────────────────────────────────────
  {
    id: 'ant_1m',
    name: 'Nouvingut/da',
    nameFemeni: 'Nouvinguda',
    nameMasculi: 'Nouvingut',
    description: 'Portes 1 mes amb nosaltres. Benvingut/da a la família!',
    descriptionFemeni: 'Portes 1 mes amb nosaltres. Benvinguda a la família!',
    descriptionMasculi: 'Portes 1 mes amb nosaltres. Benvingut a la família!',
    emoji: '🌱',
    category: 'antiguitat',
    tier: 'bronze',
    requirement: '1 mes com a membre',
  },
  {
    id: 'ant_3m',
    name: 'Arrelat/da',
    nameFemeni: 'Arrelada',
    nameMasculi: 'Arrelat',
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
    name: 'Dos Anys Junts',
    nameFemeni: 'Dos Anys Juntes',
    nameMasculi: 'Dos Anys Junts',
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
    name: 'Veterà/na del Kynetik',
    nameFemeni: 'Veterana del Kynetik',
    nameMasculi: 'Veterà del Kynetik',
    description: '5 anys al Kynetik. Un/a veritable veterà/na!',
    descriptionFemeni: '5 anys al Kynetik. Una veritable veterana!',
    descriptionMasculi: '5 anys al Kynetik. Un veritable veterà!',
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

  // ── EXPLORACIÓ: HORARIS ────────────────────────────────────
  {
    id: 'exp_matidora',
    name: 'Matiner/a',
    nameFemeni: 'Matinera',
    nameMasculi: 'Matiner',
    description: 'Has assistit a una classe abans de les 12h. Bon dia!',
    emoji: '🌅',
    category: 'exploracio',
    subcategory: 'horaris',
    tier: 'bronze',
    requirement: 'Classe abans de les 12h',
  },
  {
    id: 'exp_vespre',
    name: 'Nocturn/a',
    nameFemeni: 'Nocturna',
    nameMasculi: 'Nocturn',
    description: 'Has assistit a una classe a partir de les 20h.',
    emoji: '🌙',
    category: 'exploracio',
    subcategory: 'horaris',
    tier: 'bronze',
    requirement: 'Classe a les 20h o més tard',
  },
  {
    id: 'exp_doble',
    name: 'Doble Torn',
    description: 'Has fet classe de matí i de tarda en la mateixa setmana.',
    emoji: '💥',
    category: 'exploracio',
    subcategory: 'horaris',
    tier: 'plata',
    requirement: 'Classe de matí + tarda en la mateixa setmana',
  },

  // ── EXPLORACIÓ: VARIETAT ───────────────────────────────────
  {
    id: 'prog_cat_2',
    name: 'Doble Poder',
    description: 'Has provat programes de 2 categories diferents!',
    emoji: '⚡',
    category: 'exploracio',
    subcategory: 'varietat',
    tier: 'plata',
    requirement: '2 categories de programes diferents',
  },
  {
    id: 'prog_cat_3',
    name: 'Equilibri Total',
    description: 'Has provat força, cardio i flexibilitat!',
    descriptionFemeni: 'Has provat força, cardio i flexibilitat. Ets una esportista completa!',
    descriptionMasculi: 'Has provat força, cardio i flexibilitat. Ets un esportista complet!',
    emoji: '🌈',
    category: 'exploracio',
    subcategory: 'varietat',
    tier: 'or',
    requirement: 'Les 3 categories: força + cardio + flexibilitat',
  },
  {
    id: 'prog_cat_all',
    name: 'Atleta Complet/a',
    nameFemeni: 'Atleta Completa',
    nameMasculi: 'Atleta Complet',
    description: 'Força, cardio i flexibilitat en una mateixa setmana!',
    emoji: '🏆',
    category: 'exploracio',
    subcategory: 'varietat',
    tier: 'diamant',
    requirement: 'Les 3 categories en una mateixa setmana',
  },

  // ── EXPLORACIÓ: INTENSITAT ─────────────────────────────────
  {
    id: 'exp_3dies_seguits',
    name: 'Tres en Ratlla',
    description: 'Has assistit 3 dies consecutius. Increïble!',
    emoji: '🔥',
    category: 'exploracio',
    subcategory: 'intensitat',
    tier: 'plata',
    requirement: '3 dies consecutius',
  },
  {
    id: 'exp_3dies_setmana',
    name: 'Setmana Activa',
    description: 'Has fet 3 classes en una mateixa setmana!',
    emoji: '📅',
    category: 'exploracio',
    subcategory: 'intensitat',
    tier: 'plata',
    requirement: '3 dies en una mateixa setmana',
  },
  {
    id: 'exp_5dies',
    name: 'Setmana Completa',
    description: 'Has assistit els 5 dies laborables d\'una setmana!',
    emoji: '📋',
    category: 'exploracio',
    subcategory: 'intensitat',
    tier: 'or',
    requirement: '5 dies laborables en una mateixa setmana',
  },

  // ── ESPECIALS ──────────────────────────────────────────────
  {
    id: 'ass_aniversari',
    name: 'Volta al Sol',
    description: 'Un any sencer venint cada mes. Has donat una volta al sol amb nosaltres!',
    emoji: '☀️',
    category: 'especial',
    tier: 'diamant',
    requirement: '1 any de membre amb mínim 1 classe per mes',
  },
  {
    id: 'esp_100en365',
    name: '100 en 365',
    description: 'Has fet 100 classes en un període de 365 dies. Dedicació absoluta!',
    emoji: '💯',
    category: 'especial',
    tier: 'diamant',
    requirement: '100 classes en qualsevol període de 365 dies consecutius',
  },
  {
    id: 'esp_comeback',
    name: 'La Gran Tornada',
    description: 'Havies estat més de 30 dies sense venir, i has tornat. Benvingut/da de nou!',
    descriptionFemeni: 'Havies estat més de 30 dies sense venir, i has tornat. Benvinguda de nou!',
    descriptionMasculi: 'Havies estat més de 30 dies sense venir, i has tornat. Benvingut de nou!',
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
];

// ── INSÍGNIES D'ANY NOU (col·leccionables) ──────────────────

export function getNewYearBadges(): BadgeDefinition[] {
  const currentYear = new Date().getFullYear();
  const badges: BadgeDefinition[] = [];
  for (let year = 2020; year <= currentYear; year++) {
    badges.push({
      id: `esp_any_nou_${year}`,
      name: `Any Nou ${year}`,
      description: `Primera classe de l'any ${year}. Vas començar l'any amb tot!`,
      emoji: '🎆',
      category: 'especial',
      tier: 'bronze',
      requirement: `Classe entre l'1 i el 15 de gener de ${year}`,
    });
  }
  return badges;
}

export function getAllBadgesWithDynamic(): BadgeDefinition[] {
  return [...ALL_BADGES, ...getNewYearBadges()];
}

// ── HELPER DE GÈNERE ────────────────────────────────────────

export const getBadgeTexts = (
  badge: BadgeDefinition,
  gender?: string | null
): { name: string; description: string } => {
  if (gender === 'Femení') {
    return {
      name: badge.nameFemeni || badge.name,
      description: badge.descriptionFemeni || badge.description,
    };
  }
  if (gender === 'Masculí') {
    return {
      name: badge.nameMasculi || badge.name,
      description: badge.descriptionMasculi || badge.description,
    };
  }
  return { name: badge.name, description: badge.description };
};

// ── NOMS DE CATEGORIES ───────────────────────────────────────

export const CATEGORY_NAMES: Record<BadgeCategory, string> = {
  assistencia: '💪 Assistència',
  constancia: '🔥 Constància',
  antiguitat: '⭐ Antiguitat',
  exploracio: '🧭 Exploració i Hàbits',
  especial: '✨ Especials',
  personal: '🏆 Rècords Personals',
};

export const SUBCATEGORY_NAMES: Record<ExploracioSubcategory, string> = {
  horaris: '🌅 Horaris',
  varietat: '🧩 Varietat',
  intensitat: '📆 Intensitat setmanal',
};

// ── COLORS DE TIERS ──────────────────────────────────────────

export const TIER_COLORS: Record<BadgeTier, { bg: string; text: string; border: string; label: string }> = {
  bronze: {
    bg: 'from-rose-300 via-orange-200 to-rose-400',
    text: 'text-rose-950',
    border: 'border-rose-300',
    label: 'Bronze',
  },
  plata: {
    bg: 'from-slate-400 via-gray-300 to-slate-500',
    text: 'text-slate-800',
    border: 'border-slate-400',
    label: 'Plata',
  },
  or: {
    bg: 'from-yellow-600 via-yellow-400 to-yellow-200',
    text: 'text-yellow-900',
    border: 'border-yellow-500',
    label: 'Or',
  },
  diamant: {
    bg: 'from-cyan-400 via-blue-300 to-indigo-400',
    text: 'text-blue-900',
    border: 'border-cyan-400',
    label: 'Diamant',
  },
  llegenda: {
    bg: 'from-purple-600 via-pink-500 to-rose-500',
    text: 'text-white',
    border: 'border-purple-500',
    label: 'Llegenda',
  },
};
