import { usePrograms } from './usePrograms';

/**
 * Hook personalitzat per obtenir els colors dels programes dinàmicament
 */
export const useProgramColors = () => {
  const { programs, loading } = usePrograms();

  /**
   * Obté el color d'un programa pel seu codi
   * @param programCode - El codi del programa (ex: "BP", "BC", "BB")
   * @returns El color hex del programa o un color per defecte
   */
  const getProgramColor = (programCode: string): string => {
    // Buscar el programa pel codi
    const program = Object.values(programs).find(
      p => p.code === programCode
    );

    // Retornar el color del programa o un color per defecte
    return program?.color || '#6366f1'; // Color per defecte: blau
  };

  /**
   * Obté tots els programes amb els seus colors
   * @returns Objecte amb codi de programa com a clau i color com a valor
   */
  const getAllProgramColors = (): Record<string, string> => {
    const colorMap: Record<string, string> = {};
    
    Object.values(programs).forEach(program => {
      colorMap[program.code] = program.color;
    });

    return colorMap;
  };

  /**
   * Obté el nom d'un programa pel seu codi
   * @param programCode - El codi del programa (ex: "BP", "BC", "BB")
   * @returns El nom del programa o el codi si no es troba
   */
  const getProgramName = (programCode: string): string => {
    const program = Object.values(programs).find(
      p => p.code === programCode
    );

    return program?.name || programCode;
  };

  return {
    getProgramColor,
    getAllProgramColors,
    getProgramName,
    loading,
  };
};
