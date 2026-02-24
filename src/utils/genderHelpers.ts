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

// Retorna "activa" / "actiu" / "actiu/va"
export const getActiu = (gender?: string | null): string =>
  getAdjectiu(gender, 'activa', 'actiu', 'actiu/va');

// Retorna "increïble" (invariable en català)
export const getIncreible = (_gender?: string | null): string => 'increïble';

// Retorna "imparable" (invariable en català)
export const getImparable = (_gender?: string | null): string => 'imparable';
