import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword, PASSWORD_RULES } from '../src/utils/passwordPolicy.js';

const failing = (password) => checkPassword(password).rules.filter((r) => !r.ok).map((r) => r.id);

describe('checkPassword', () => {
    it('acepta una contraseña que cumple las cuatro reglas', () => {
        const result = checkPassword('Lima#2026');
        assert.equal(result.valid, true);
        assert.deepEqual(result.errors, []);
    });

    it('exige al menos 8 caracteres', () => {
        assert.deepEqual(failing('Ab1#xyz'), ['length']);
        assert.equal(checkPassword('Ab1#wxyz').valid, true);
    });

    it('exige al menos una mayúscula, incluida la Ñ', () => {
        assert.deepEqual(failing('lima#2026'), ['uppercase']);
        assert.equal(checkPassword('ñandú#2026Ñ').valid, true);
    });

    it('exige al menos un dígito', () => {
        assert.deepEqual(failing('Lima#abcd'), ['digit']);
    });

    it('solo cuenta como especiales # $ % & * @', () => {
        assert.deepEqual(failing('Lima!2026'), ['special']);
        for (const char of ['#', '$', '%', '&', '*', '@']) {
            assert.equal(checkPassword(`Lima${char}2026`).valid, true, `debería aceptar ${char}`);
        }
    });

    it('devuelve todos los mensajes que fallan', () => {
        const result = checkPassword('abc');
        assert.equal(result.valid, false);
        assert.equal(result.errors.length, PASSWORD_RULES.length);
    });

    it('rechaza valores que no son texto', () => {
        assert.equal(checkPassword(undefined).valid, false);
        assert.equal(checkPassword(12345678).valid, false);
    });

    it('rechaza contraseñas de más de 72 bytes (límite de bcrypt)', () => {
        const result = checkPassword(`Lima#2026${'a'.repeat(64)}`);
        assert.equal(result.valid, false);
        assert.match(result.errors.at(-1), /72 bytes/);
    });
});
