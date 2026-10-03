import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import authenticate from '../src/middlewares/authenticate.js';

const SECRET = 'clave-solo-para-pruebas';

function mockRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

function run(authorization) {
    const req = { headers: authorization ? { authorization } : {} };
    const res = mockRes();
    let called = false;
    authenticate(req, res, () => { called = true; });
    return { req, res, called };
}

describe('authenticate', () => {
    before(() => { process.env.JWT_SECRET = SECRET; });

    it('responde 401 si no hay cabecera Authorization', () => {
        const { res, called } = run();
        assert.equal(called, false);
        assert.equal(res.statusCode, 401);
    });

    it('responde 401 si el esquema no es Bearer', () => {
        const token = jwt.sign({ sub: 'abc' }, SECRET);
        const { res, called } = run(`Basic ${token}`);
        assert.equal(called, false);
        assert.equal(res.statusCode, 401);
    });

    it('responde 401 si la firma no coincide con JWT_SECRET', () => {
        const token = jwt.sign({ sub: 'abc', roles: ['admin'] }, 'otra-clave');
        const { res, called } = run(`Bearer ${token}`);
        assert.equal(called, false);
        assert.equal(res.statusCode, 401);
    });

    it('responde 401 si el token caducó', () => {
        const token = jwt.sign({ sub: 'abc', exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
        const { res, called } = run(`Bearer ${token}`);
        assert.equal(called, false);
        assert.equal(res.statusCode, 401);
        assert.match(res.body.message, /caducado/);
    });

    it('rechaza tokens sin firma (alg "none")', () => {
        const unsigned = jwt.sign({ sub: 'abc', roles: ['admin'] }, null, { algorithm: 'none' });
        const { res, called } = run(`Bearer ${unsigned}`);
        assert.equal(called, false);
        assert.equal(res.statusCode, 401);
    });

    it('acepta un token válido y expone userId y userRoles', () => {
        const token = jwt.sign({ sub: 'u-1', roles: ['user'] }, SECRET, { expiresIn: '1h' });
        const { req, called } = run(`Bearer ${token}`);
        assert.equal(called, true);
        assert.equal(req.userId, 'u-1');
        assert.deepEqual(req.userRoles, ['user']);
    });

    it('usa una lista vacía si el token no trae roles', () => {
        const token = jwt.sign({ sub: 'u-2' }, SECRET);
        const { req, called } = run(`Bearer ${token}`);
        assert.equal(called, true);
        assert.deepEqual(req.userRoles, []);
    });
});
