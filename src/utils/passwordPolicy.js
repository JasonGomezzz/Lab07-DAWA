// Política de contraseña de la tarea. No depende de Node: el servidor la usa antes
// de hashear y el navegador la importa desde /shared/passwordPolicy.js para la
// validación en vivo, así ambos lados aplican exactamente las mismas reglas.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_SPECIAL_CHARS = ['#', '$', '%', '&', '*', '@'];
// bcrypt ignora todo lo que pase de 72 bytes; se rechaza para que no haya sorpresas.
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_RULES = [
    {
        id: 'length',
        label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
        test: (value) => [...value].length >= PASSWORD_MIN_LENGTH
    },
    {
        id: 'uppercase',
        label: 'Al menos una letra mayúscula',
        test: (value) => /\p{Lu}/u.test(value)
    },
    {
        id: 'digit',
        label: 'Al menos un dígito',
        test: (value) => /[0-9]/.test(value)
    },
    {
        id: 'special',
        label: `Al menos un carácter especial: ${PASSWORD_SPECIAL_CHARS.join(' ')}`,
        test: (value) => PASSWORD_SPECIAL_CHARS.some((char) => value.includes(char))
    }
];

export function checkPassword(password) {
    const value = typeof password === 'string' ? password : '';
    const rules = PASSWORD_RULES.map(({ id, label, test }) => ({ id, label, ok: test(value) }));
    const errors = rules.filter((rule) => !rule.ok).map((rule) => rule.label);

    if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
        errors.push(`Máximo ${PASSWORD_MAX_BYTES} bytes`);
    }

    return { valid: errors.length === 0, rules, errors };
}
