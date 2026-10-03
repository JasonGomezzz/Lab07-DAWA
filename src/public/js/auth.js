// Sesión del lado del cliente. El JWT vive en sessionStorage: se borra al cerrar la
// pestaña y el navegador no lo envía solo, así que cada llamada a la API lo agrega
// en la cabecera Authorization. Esta protección es de interfaz; la autorización real
// la imponen authenticate y authorize en el servidor.

const TOKEN_KEY = 'salvoconducto.token';

export class ApiError extends Error {
    constructor(status, message, errors = []) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

// Error que indica que ya se redirigió (sesión cerrada o sin permisos).
export class NavigationAbort extends Error {}

function storage() {
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

export function saveToken(token) {
    storage()?.setItem(TOKEN_KEY, token);
}

export function clearSession() {
    storage()?.removeItem(TOKEN_KEY);
}

// Decodifica el payload (base64url) sin verificar la firma: eso solo puede hacerlo
// el servidor, que conoce JWT_SECRET.
export function decodeSegment(segment) {
    try {
        const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
}

export function getSession() {
    const token = storage()?.getItem(TOKEN_KEY);
    if (!token) return null;

    const [header, payload] = token.split('.').map((part, index) => (index < 2 ? decodeSegment(part) : part));
    if (!header || !payload || typeof payload.exp !== 'number') {
        clearSession();
        return null;
    }

    return {
        token,
        header,
        payload,
        userId: payload.sub,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        issuedAt: (payload.iat ?? 0) * 1000,
        expiresAt: payload.exp * 1000
    };
}

export const isExpired = (session, now = Date.now()) => session.expiresAt <= now;
export const isAdmin = (session) => session.roles.includes('admin');

// "admin" incluye lo que puede "user".
export function hasRole(session, required) {
    if (required === 'admin') return isAdmin(session);
    if (required === 'user') return session.roles.includes('user') || isAdmin(session);
    return true;
}

export const homeFor = (session) => (isAdmin(session) ? '/admin/dashboard' : '/dashboard');

function go(url) {
    window.location.replace(url);
    throw new NavigationAbort(url);
}

export function logout(reason = 'salida') {
    clearSession();
    go(`/signIn?motivo=${reason}`);
}

let expiryTimer;
function watchExpiry(session) {
    clearTimeout(expiryTimer);
    const remaining = session.expiresAt - Date.now();
    // setTimeout admite como máximo ~24,8 días.
    expiryTimer = setTimeout(() => logout('expirada'), Math.min(remaining, 2 ** 31 - 1));

    // Al volver a una pestaña dormida el temporizador puede llegar tarde.
    document.addEventListener('visibilitychange', () => {
        const current = getSession();
        if (document.visibilityState === 'visible' && (!current || isExpired(current))) {
            logout('expirada');
        }
    });
}

// Reglas de navegación de la tarea:
// - sin token válido → /signIn
// - token expirado → cerrar sesión y /signIn
// - rol insuficiente → /403
// - en /signIn o /signUp con sesión activa → dashboard según rol
export function guardPage(required) {
    const session = getSession();

    if (required === 'guest') {
        if (session && !isExpired(session)) go(homeFor(session));
        if (session) clearSession();
        return null;
    }

    if (required === 'public') {
        if (session && isExpired(session)) clearSession();
        return session && !isExpired(session) ? session : null;
    }

    if (!session) go('/signIn?motivo=requerida');
    if (isExpired(session)) logout('expirada');
    if (!hasRole(session, required)) go(`/403?desde=${encodeURIComponent(window.location.pathname)}`);

    watchExpiry(session);
    return session;
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    if (auth) {
        const session = getSession();
        if (!session || isExpired(session)) logout('expirada');
        headers.Authorization = `Bearer ${session.token}`;
    }

    let response;
    try {
        response = await fetch(path, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch {
        throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa que esté encendido.');
    }

    const data = await response.json().catch(() => ({}));

    if (auth && response.status === 401) logout('expirada');
    if (auth && response.status === 403) go(`/403?desde=${encodeURIComponent(window.location.pathname)}`);
    if (!response.ok) {
        throw new ApiError(response.status, data.message || 'Ocurrió un error inesperado.', data.errors || []);
    }
    return data;
}
