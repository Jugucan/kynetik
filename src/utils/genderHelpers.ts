// Retorna el salut correcte segons el gènere declarat
export const getBenvingut = (gender?: string | null): string => {
  if (gender === 'Femení') return 'Benvinguda';
  if (gender === 'Masculí') return 'Benvingut';
  return 'Benvingut/da';
};

// Retorna l'adjectiu correcte segons el gènere
export const getAdjectiu = (
  gender?: string | null,
  femení?: string,
  masculí?: string,
  neutral?: string
): string => {
  if (gender === 'Femení') return femení || neutral || '';
  if (gender === 'Masculí') return masculí || neutral || '';
  return neutral || '';
};
