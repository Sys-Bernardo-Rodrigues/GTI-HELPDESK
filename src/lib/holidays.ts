/**
 * Função para calcular a Páscoa (algoritmo de Meeus/Jones/Butcher)
 */
function calculateEaster(year: number): Date {
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
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Retorna se uma data é feriado nacional brasileiro
 */
export function isHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  // Feriados fixos
  const fixedHolidays: Array<{ month: number; day: number }> = [
    { month: 0, day: 1 },   // Ano Novo
    { month: 3, day: 21 },  // Tiradentes
    { month: 4, day: 1 },   // Dia do Trabalhador
    { month: 8, day: 7 },   // Independência
    { month: 9, day: 12 },  // Nossa Senhora Aparecida
    { month: 10, day: 2 },  // Finados
    { month: 10, day: 15 }, // Proclamação da República
    { month: 11, day: 25 }, // Natal
  ];

  // Verificar feriados fixos
  for (const holiday of fixedHolidays) {
    if (month === holiday.month && day === holiday.day) {
      return true;
    }
  }

  // Feriados móveis baseados na Páscoa
  const easter = calculateEaster(year);
  const easterTime = easter.getTime();

  // Carnaval (48 dias antes da Páscoa - Segunda e Terça)
  const carnivalMonday = new Date(easterTime - 48 * 24 * 60 * 60 * 1000);
  const carnivalTuesday = new Date(easterTime - 47 * 24 * 60 * 60 * 1000);

  // Sexta-feira Santa (2 dias antes da Páscoa)
  const goodFriday = new Date(easterTime - 2 * 24 * 60 * 60 * 1000);

  // Corpus Christi (60 dias após a Páscoa)
  const corpusChristi = new Date(easterTime + 60 * 24 * 60 * 60 * 1000);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (
    isSameDate(dateOnly, carnivalMonday) ||
    isSameDate(dateOnly, carnivalTuesday) ||
    isSameDate(dateOnly, goodFriday) ||
    isSameDate(dateOnly, corpusChristi)
  ) {
    return true;
  }

  return false;
}

/**
 * Retorna o nome do feriado se a data for um feriado
 */
export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const holidayNames: Record<string, string> = {
    "1-1": "Ano Novo",
    "3-21": "Tiradentes",
    "4-1": "Dia do Trabalhador",
    "8-7": "Independência do Brasil",
    "9-12": "Nossa Senhora Aparecida",
    "10-2": "Finados",
    "10-15": "Proclamação da República",
    "11-25": "Natal",
  };

  const key = `${month}-${day}`;
  if (holidayNames[key]) {
    return holidayNames[key];
  }

  // Feriados móveis
  const easter = calculateEaster(year);
  const easterTime = easter.getTime();

  const carnivalMonday = new Date(easterTime - 48 * 24 * 60 * 60 * 1000);
  const carnivalTuesday = new Date(easterTime - 47 * 24 * 60 * 60 * 1000);
  const goodFriday = new Date(easterTime - 2 * 24 * 60 * 60 * 1000);
  const corpusChristi = new Date(easterTime + 60 * 24 * 60 * 60 * 1000);

  const dateOnly = new Date(year, month, day);

  if (isSameDate(dateOnly, carnivalMonday)) return "Carnaval (Segunda)";
  if (isSameDate(dateOnly, carnivalTuesday)) return "Carnaval (Terça)";
  if (isSameDate(dateOnly, goodFriday)) return "Sexta-feira Santa";
  if (isSameDate(dateOnly, corpusChristi)) return "Corpus Christi";

  return null;
}

/**
 * Compara duas datas ignorando horas/minutos/segundos
 */
function isSameDate(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

