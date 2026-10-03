// Cálculo de edad a partir de la fecha de nacimiento. Sin dependencias de Node:
// también se sirve al navegador en /shared/age.js.

export const MAX_AGE = 120;

function toDate(value) {
    if (value === null || value === undefined || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

// birthdate es una fecha sin hora que Mongo guarda a medianoche UTC. Sus partes se
// leen en UTC y las de "hoy" en hora local; si no, en Lima (UTC-5) el cumpleaños
// caería un día antes.
export function calculateAge(birthdate, today = new Date()) {
    const birth = toDate(birthdate);
    if (!birth) return null;

    const month = birth.getUTCMonth();
    const day = birth.getUTCDate();
    let age = today.getFullYear() - birth.getUTCFullYear();
    if (today.getMonth() < month || (today.getMonth() === month && today.getDate() < day)) {
        age -= 1;
    }
    return age;
}

// Devuelve el mensaje de error o null si la fecha es aceptable.
export function birthdateError(birthdate, today = new Date()) {
    const age = calculateAge(birthdate, today);
    if (age === null) return 'La fecha de nacimiento no es válida';
    if (age < 0 || toDate(birthdate) > today) return 'La fecha de nacimiento no puede estar en el futuro';
    if (age > MAX_AGE) return `La fecha de nacimiento indica más de ${MAX_AGE} años`;
    return null;
}
