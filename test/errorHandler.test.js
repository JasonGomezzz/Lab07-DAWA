import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import errorHandler, { apiNotFound } from '../src/middlewares/errorHandler.js';

function handle(err) {
    const res = {
        headersSent: false,
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    errorHandler(err, {}, res, () => {});
    return res;
}

describe('errorHandler', () => {
    it('respeta el status de los errores de negocio', () => {
        const err = Object.assign(new Error('Usuario no encontrado'), { status: 404 });
        const res = handle(err);
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { message: 'Usuario no encontrado' });
    });

    it('incluye la lista de errores cuando el servicio la adjunta', () => {
        const err = Object.assign(new Error('Contraseña débil'), { status: 400, errors: ['Al menos un dígito'] });
        assert.deepEqual(handle(err).body.errors, ['Al menos un dígito']);
    });

    it('convierte errores de validación de mongoose en 400 con mensajes', () => {
        const User = mongoose.model('ErrorHandlerProbe', new mongoose.Schema({
            lastName: { type: String, required: [true, 'El apellido es requerido'] }
        }));
        const err = new User({}).validateSync();
        const res = handle(err);
        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body.errors, ['El apellido es requerido']);
    });

    it('convierte un email duplicado (E11000) en 400', () => {
        const res = handle(Object.assign(new Error('E11000'), { code: 11000, keyValue: { email: 'a@b.pe' } }));
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'El email ya se encuentra en uso');
    });

    it('responde 400 si el JSON del body está mal formado', () => {
        const res = handle(Object.assign(new SyntaxError('Unexpected token'), { status: 400, type: 'entity.parse.failed' }));
        assert.equal(res.statusCode, 400);
        assert.match(res.body.message, /JSON/);
    });

    it('oculta el detalle de los errores 500', () => {
        const log = mock.method(console, 'error', () => {});
        const res = handle(new Error('connection string con contraseña'));
        log.mock.restore();
        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, { message: 'Error interno del servidor' });
    });
});

describe('apiNotFound', () => {
    it('responde 404 en JSON con la ruta pedida', () => {
        const res = {
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; }
        };
        apiNotFound({ method: 'GET', originalUrl: '/api/nada' }, res);
        assert.equal(res.statusCode, 404);
        assert.match(res.body.message, /GET \/api\/nada/);
    });
});
