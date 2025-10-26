import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 💥 NOU: FUNCIONS PER A LA GESTIÓ DE L'ANY FISCAL 💥

/**
 * Calcula l'any fiscal per a una data donada.
 * L'any fiscal comença l'1 de febrer.
 * @param dateInput La data a comprovar (ha de ser un objecte Date o una string en format YYYY-MM-DD).
 * @returns L'any en què comença l'any fiscal (e.g., 2024 per a 01/02/2024 - 31/01/2025).
 */
export function getFiscalYear(dateInput: Date | string): number {
  let date: Date;

  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map(p => parseInt(p, 10));
    if (parts.length < 3 || parts.some(isNaN)) {
        // En cas d'error de parseig, utilitzarem l'any actual com a fallback
        date = new Date(); 
    } else {
        // parts[1] és el mes (1-12), new Date vol mes (0-11)
        date = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  } else {
    date = dateInput;
  }
  
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-gener, 1-febrer, ..., 11-desembre

  // Si el mes és gener (0), pertany a l'any fiscal que va començar l'any anterior.
  if (month === 0) {
    return year - 1;
  }
  // Si el mes és febrer (1) o posterior, pertany a l'any fiscal que comença aquest any.
  return year;
}

/**
 * Genera un rang d'anys fiscals.
 * @param startYear L'any fiscal inicial (e.g., 2023).
 * @param endYear L'any fiscal final (inclòs).
 * @returns Un array d'anys fiscals.
 */
export function getFiscalYearsRange(startYear: number, endYear: number): number[] {
  const years = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }
  return years;
}
