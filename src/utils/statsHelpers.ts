// Funcions auxiliars per a les estadístiques

export const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeCenterName = (center: string | undefined): string => {
  if (!center) return 'na';

  let normalized = center.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');

  const accentsMap: { [key: string]: string } = {
    'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a',
    'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
    'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
    'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o',
    'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
    'ç': 'c', 'ñ': 'n'
  };

  return normalized.split('').map(char => accentsMap[char] || char).join('');
};

/**
 * Comprova si dos noms de centres coincideixen.
 * Accepta diferents variants del mateix centre:
 * - 'Arbúcies', 'arbucies', 'Arbucies' → tots coincideixen
 * - 'Sant Hilari', 'sant-hilari', 'SantHilari' → tots coincideixen
 */
export const centersMatch = (center1: string | undefined, center2: string | undefined): boolean => {
  const normalized1 = normalizeCenterName(center1);
  const normalized2 = normalizeCenterName(center2);
  
  // Comparació directa (per IDs com 'arbucies' o 'sant-hilari')
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Mapa de variants conegudes per compatibilitat
  const centerVariants: { [key: string]: string[] } = {
    'arbucies': ['arbucies', 'arbúcies'],
    'santhilari': ['santhilari', 'sant-hilari', 'santhilari'],
  };
  
  // Buscar si ambdós centres són variants del mateix
  for (const [baseId, variants] of Object.entries(centerVariants)) {
    const variants1Match = variants.some(v => normalizeCenterName(v) === normalized1);
    const variants2Match = variants.some(v => normalizeCenterName(v) === normalized2);
    
    if (variants1Match && variants2Match) {
      return true;
    }
  }
  
  return false;
};

export interface Session {
  time: string;
  program: string;
  center?: string;
  isCustom?: boolean;
  isDeleted?: boolean;
  deleteReason?: string;
  addReason?: string;
}
