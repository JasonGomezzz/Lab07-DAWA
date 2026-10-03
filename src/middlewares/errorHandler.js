import mongoose from 'mongoose';

// 404 para cualquier ruta /api que no exista: la API siempre responde JSON.
export function apiNotFound(req, res) {
    res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// Manejador global: traduce errores conocidos a 400 y oculta el detalle de los 500.
export default function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    let status = err.status || 500;
    let message = err.message;
    let errors = err.errors;

    if (err instanceof mongoose.Error.ValidationError) {
        status = 400;
        message = 'Hay datos inválidos';
        errors = Object.values(err.errors).map((e) => e.message);
    } else if (err instanceof mongoose.Error.CastError) {
        status = 400;
        message = `Valor inválido para ${err.path}`;
        errors = undefined;
    } else if (err.code === 11000) {
        status = 400;
        message = err.keyValue?.email ? 'El email ya se encuentra en uso' : 'Registro duplicado';
        errors = undefined;
    } else if (err.type === 'entity.parse.failed') {
        status = 400;
        message = 'El cuerpo de la petición no es un JSON válido';
    }

    if (status >= 500) {
        console.error(err);
        message = 'Error interno del servidor';
        errors = undefined;
    }

    res.status(status).json(Array.isArray(errors) ? { message, errors } : { message });
}
