import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import authorize from '../src/middlewares/authorize.js';

function run(requiredRoles, userRoles) {
    const req = userRoles === undefined ? {} : { userRoles };
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    let called = false;
    authorize(requiredRoles)(req, res, () => { called = true; });
    return { res, called };
}

describe('authorize', () => {
    it('responde 401 si authenticate no se ejecutó antes', () => {
        const { res, called } = run(['admin'], undefined);
        assert.equal(called, false);
        assert.equal(res.statusCode, 401);
    });

    it('deja pasar a cualquier autenticado cuando no se exigen roles', () => {
        assert.equal(run([], ['user']).called, true);
        assert.equal(run([], []).called, true);
    });

    it('deja pasar si el usuario tiene alguno de los roles requeridos', () => {
        assert.equal(run(['admin'], ['user', 'admin']).called, true);
        assert.equal(run(['user', 'admin'], ['user']).called, true);
    });

    it('responde 403 si el usuario no tiene el rol requerido', () => {
        const { res, called } = run(['admin'], ['user']);
        assert.equal(called, false);
        assert.equal(res.statusCode, 403);
    });
});
