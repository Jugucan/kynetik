// Funcions auxiliars per a les estadístiques
import type { Center } from '@/hooks/useCenters';

export const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Normalitza el nom d'un centre per comparacions:
 * - Converteix a minúscules
 * - Elimina espais i guions
 * - Elimina accents
 */
export const normalizeCenterName = (center: string | undefined): string => {
  if (!center) return '';

  let normalized = center.toLowerCase().replace(/[\s-]+/g, '');

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
 * Converteix un nom de centre (antic o nou) al seu ID únic.
 * Això permet fer coincidir dades antigues amb la configuració nova.
 * 
 * @param centerName - El nom del centre (pot ser 'Arbúcies', 'arbucies', 'Sant Hilari', etc.)
 * @param centers - Llista de centres disponibles amb els seus IDs únics
 * @returns L'ID únic del centre o el nom normalitzat si no es troba
 */
export const getCenterIdFromName = (
  centerName: string | undefined, 
  centers: Center[]
): string => {
  if (!centerName) return '';
  
  const normalizedInput = normalizeCenterName(centerName);
  
  // Buscar el centre que coincideixi pel nom normalitzat
  const matchingCenter = centers.find(center => {
    const normalizedCenterName = normalizeCenterName(center.name);
    const normalizedCenterId = normalizeCenterName(center.id);
    
    return normalizedInput === normalizedCenterName || 
           normalizedInput === normalizedCenterId;
  });
  
  // Si trobem el centre, retornar el seu ID únic
  if (matchingCenter) {
    return matchingCenter.id;
  }
  
  // Si no es troba, retornar el nom normalitzat (per compatibilitat)
  return normalizedInput;
};

/**
 * Comprova si dos centres coincideixen usant els seus IDs únics.
 * 
 * @param center1 - Nom o ID del primer centre
 * @param center2 - Nom o ID del segon centre  
 * @param centers - Llista de centres per fer la conversió a ID
 * @returns true si els centres coincideixen
 */
export const centersMatch = (
  center1: string | undefined, 
  center2: string | undefined,
  centers: Center[] = []
): boolean => {
  if (!center1 || !center2) return false;
  
  // Si no hi ha centres configurats, fer comparació normalitzada simple
  if (centers.length === 0) {
    return normalizeCenterName(center1) === normalizeCenterName(center2);
  }
  
  // Convertir ambdós a IDs únics
  const id1 = getCenterIdFromName(center1, centers);
  const id2 = getCenterIdFromName(center2, centers);
  
  return id1 === id2;
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
