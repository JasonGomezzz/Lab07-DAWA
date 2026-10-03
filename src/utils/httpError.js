// Crea un Error con status HTTP (y lista opcional de detalles) para el manejador global.
export default function httpError(status, message, errors) {
    const err = new Error(message);
    err.status = status;
    if (errors) err.errors = errors;
    return err;
}
