/**
 * Calculates the date of Easter Sunday (Western Easter) for a given year
 * using the Meeus/Jones/Butcher algorithm.
 */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Returns the next Monday date. If the given date is already a Monday, it returns the same date.
 */
function getNextMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  if (day === 1) {
    return result;
  }
  const diff = day === 0 ? 1 : 8 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

/**
 * Generates a Set of Colombian holiday dates in YYYY-MM-DD format for a given year.
 * Handles fixed holidays, Easter-dependent holidays, and Emiliani Law shifts.
 */
export function getColombianHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper for Emiliani holidays (moves to the next Monday)
  const addEmiliani = (month: number, day: number) => {
    const d = new Date(year, month - 1, day);
    const shifted = getNextMonday(d);
    holidays.add(formatDate(shifted));
  };

  // 1. Fixed Holidays (no shift)
  holidays.add(`${year}-01-01`); // Año Nuevo
  holidays.add(`${year}-05-01`); // Día del Trabajo
  holidays.add(`${year}-07-20`); // Grito de Independencia
  holidays.add(`${year}-08-07`); // Batalla de Boyacá
  holidays.add(`${year}-12-08`); // Inmaculada Concepción
  holidays.add(`${year}-12-25`); // Navidad

  // 2. Emiliani Law Holidays (shift to next Monday)
  addEmiliani(1, 6);   // Reyes Magos (6 Jan)
  addEmiliani(3, 19);  // San José (19 Mar)
  addEmiliani(6, 29);  // San Pedro y San Pablo (29 Jun)
  addEmiliani(8, 15);  // Asunción de la Virgen (15 Aug)
  addEmiliani(10, 12); // Día de la Raza (12 Oct)
  addEmiliani(11, 1);  // Todos los Santos (1 Nov)
  addEmiliani(11, 11); // Independencia de Cartagena (11 Nov)

  // 3. Easter/Semana Santa Holidays (relative to Easter)
  const easter = getEasterDate(year);

  // Holy Thursday (Jueves Santo)
  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  holidays.add(formatDate(holyThursday));

  // Holy Friday (Viernes Santo)
  const holyFriday = new Date(easter);
  holyFriday.setDate(easter.getDate() - 2);
  holidays.add(formatDate(holyFriday));

  // Ascension (Ascensión del Señor): Easter + 39 days shifted to next Monday (Easter + 43 days)
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 43);
  holidays.add(formatDate(ascension));

  // Corpus Christi: Easter + 60 days shifted to next Monday (Easter + 64 days)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 64);
  holidays.add(formatDate(corpusChristi));

  // Sacred Heart (Sagrado Corazón): Easter + 68 days shifted to next Monday (Easter + 71 days)
  const sacredHeart = new Date(easter);
  sacredHeart.setDate(easter.getDate() + 71);
  holidays.add(formatDate(sacredHeart));

  return holidays;
}
