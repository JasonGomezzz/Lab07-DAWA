import bcrypt from 'bcrypt';
import { checkPassword } from './passwordPolicy.js';
import httpError from './httpError.js';

function saltRounds() {
    const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);
    return Number.isInteger(rounds) && rounds >= 4 ? rounds : 10;
}

// Lanza 400 con la lista de reglas incumplidas si la contraseña no pasa la política.
export function assertPasswordPolicy(password) {
    const { valid, errors } = checkPassword(password);
    if (!valid) throw httpError(400, 'La contraseña no cumple la política de seguridad', errors);
}

export function hashPassword(password) {
    return bcrypt.hash(password, saltRounds());
}

export function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
