import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAge, birthdateError } from '../src/utils/age.js';

// "Hoy" fijo en hora local: 3 de octubre de 2026.
const TODAY = new Date(2026, 9, 3, 20, 30);

describe('calculateAge', () => {
    it('cumple años el mismo día', () => {
        assert.equal(calculateAge('2000-10-03', TODAY), 26);
    });

    it('todavía no cumple si el cumpleaños es mañana', () => {
        assert.equal(calculateAge('2000-10-04', TODAY), 25);
    });

    it('ya cumplió si el mes de nacimiento ya pasó', () => {
        assert.equal(calculateAge('2000-01-31', TODAY), 26);
    });

    it('acepta objetos Date guardados a medianoche UTC', () => {
        assert.equal(calculateAge(new Date('2000-10-03T00:00:00.000Z'), TODAY), 26);
    });

    it('trata el 29 de febrero como cumplido recién el 1 de marzo en años no bisiestos', () => {
        assert.equal(calculateAge('2004-02-29', new Date(2026, 1, 28)), 21);
        assert.equal(calculateAge('2004-02-29', new Date(2026, 2, 1)), 22);
    });

    it('devuelve null para valores vacíos o inválidos', () => {
        assert.equal(calculateAge(undefined, TODAY), null);
        assert.equal(calculateAge('', TODAY), null);
        assert.equal(calculateAge('no-es-fecha', TODAY), null);
    });
});

describe('birthdateError', () => {
    it('acepta una fecha pasada razonable', () => {
        assert.equal(birthdateError('1999-05-21', TODAY), null);
    });

    it('rechaza fechas futuras', () => {
        assert.match(birthdateError('2030-01-01', TODAY), /futuro/);
    });

    it('rechaza edades mayores a 120 años', () => {
        assert.match(birthdateError('1890-01-01', TODAY), /120/);
    });

    it('rechaza fechas inválidas', () => {
        assert.match(birthdateError('31/31/2000', TODAY), /no es válida/);
    });
});
