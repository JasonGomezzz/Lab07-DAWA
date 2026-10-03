// Utilidades de interfaz compartidas por todas las páginas.
import { NavigationAbort, ApiError, logout, isAdmin } from './auth.js';
import { checkPassword } from '/shared/passwordPolicy.js';

/* global M */

const LOCALE = 'es-PE';

// Ejecuta la lógica de la página. Las redirecciones de la guarda cortan el flujo
// con NavigationAbort, que no es un error real.
export async function boot(main) {
    try {
        await main();
    } catch (error) {
        if (error instanceof NavigationAbort) return;
        console.error(error);
        toast(error instanceof ApiError ? error.message : 'Algo salió mal. Recarga la página.', 'error');
    }
}

export function reveal() {
    document.body.classList.add('is-ready');
}

export function toast(text, kind = 'info', displayLength = 4500) {
    if (!window.M) return;
    new M.Toast({ text, classes: kind === 'info' ? '' : `toast--${kind}`, displayLength });
}

export function icon(name, extraClass = '') {
    return `<svg class="icon ${extraClass}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

/* --- Navegación según la sesión ---------------------------------------- */

function formatClock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

function startSessionClock(session) {
    const clocks = document.querySelectorAll('[data-session-clock]');
    if (!clocks.length) return;
    const tick = () => {
        const left = session.expiresAt - Date.now();
        clocks.forEach((clock) => {
            clock.querySelector('[data-session-left]').textContent = formatClock(left);
            clock.classList.toggle('is-low', left < 5 * 60 * 1000);
        });
    };
    tick();
    setInterval(tick, 1000);
}

export function initChrome(session) {
    if (window.M) M.Sidenav.init(document.querySelectorAll('.sidenav'), { edge: 'right' });

    document.querySelectorAll('[data-action="logout"]').forEach((button) => {
        button.addEventListener('click', () => {
            try {
                logout('salida');
            } catch (error) {
                if (!(error instanceof NavigationAbort)) throw error;
            }
        });
    });

    document.querySelectorAll('[data-nav]').forEach((el) => {
        el.hidden = (el.dataset.nav === 'app') !== Boolean(session);
    });
    document.querySelectorAll('[data-only-role="admin"]').forEach((el) => {
        el.hidden = !(session && isAdmin(session));
    });

    if (session) startSessionClock(session);
}

/* --- Formularios -------------------------------------------------------- */

export function setBusy(button, busy, busyLabel) {
    const label = button.querySelector('[data-label]') ?? button;
    if (busy) {
        button.dataset.idleLabel = label.textContent;
        if (busyLabel) label.textContent = busyLabel;
        button.setAttribute('aria-busy', 'true');
    } else {
        if (button.dataset.idleLabel) label.textContent = button.dataset.idleLabel;
        button.removeAttribute('aria-busy');
    }
}

export function setFieldError(input, message) {
    const field = input.closest('.input-field');
    const help = field?.querySelector('.supporting-text');
    if (!field) return;
    if (help && help.dataset.default === undefined) help.dataset.default = help.textContent;
    field.classList.toggle('has-error', Boolean(message));
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (help) help.textContent = message || help.dataset.default;
}

export function clearFieldErrors(form) {
    form.querySelectorAll('input').forEach((input) => setFieldError(input, ''));
}

// El error de un campo desaparece apenas la persona lo corrige.
export function clearErrorsOnInput(form) {
    form.addEventListener('input', (event) => {
        if (event.target.getAttribute('aria-invalid') === 'true') setFieldError(event.target, '');
    });
}

// Muestra un aviso con título y lista opcional (texto plano, nunca HTML del servidor).
export function showNotice(container, { kind = 'error', title, items = [] }) {
    container.replaceChildren();
    if (!title) {
        container.hidden = true;
        return;
    }
    const box = document.createElement('div');
    box.className = `notice notice--${kind}`;
    box.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    box.innerHTML = icon(kind === 'ok' ? 'check' : kind === 'error' ? 'alert' : 'info');
    const body = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = title;
    body.append(strong);
    if (items.length) {
        const list = document.createElement('ul');
        items.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item;
            list.append(li);
        });
        body.append(list);
    }
    box.append(body);
    container.append(box);
    container.hidden = false;
}

export function bindPasswordToggles(root = document) {
    root.querySelectorAll('[data-toggle-password]').forEach((button) => {
        const input = document.getElementById(button.dataset.togglePassword);
        button.addEventListener('click', () => {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(show));
            button.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
            button.querySelector('use').setAttribute('href', show ? '#i-eye-off' : '#i-eye');
        });
    });
}

// Marca en vivo las reglas de la política (las mismas que valida el servidor).
export function bindPasswordRules(input, list) {
    const update = () => {
        const { rules } = checkPassword(input.value);
        rules.forEach((rule) => {
            list.querySelector(`[data-rule="${rule.id}"]`)?.classList.toggle('is-ok', rule.ok);
        });
    };
    input.addEventListener('input', update);
    update();
}

/* --- Datos de usuario ----------------------------------------------------- */

export const fullName = (user) => [user.name, user.lastName].filter(Boolean).join(' ');

export function initials(user) {
    return [user.name, user.lastName]
        .map((part) => (part || '').trim().charAt(0))
        .join('')
        .toUpperCase() || '?';
}

// Foto de perfil si la URL carga; si no, iniciales.
export function renderAvatar(container, user) {
    container.replaceChildren();
    const fallback = () => {
        container.replaceChildren();
        container.textContent = initials(user);
        container.classList.add('avatar--initials');
    };
    if (!user.url_profile) return fallback();
    container.classList.remove('avatar--initials');
    const img = document.createElement('img');
    img.alt = `Foto de ${fullName(user)}`;
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', fallback, { once: true });
    img.src = user.url_profile;
    container.append(img);
}

// birthdate es solo fecha (medianoche UTC): se formatea en UTC para no correr el día.
export function formatDate(value, { utc = false } = {}) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString(LOCALE, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: utc ? 'UTC' : undefined
    });
}

export function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    return `${formatDate(date)} · ${date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
}

export function formatTime(value) {
    return new Date(value).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

// Valor YYYY-MM-DD para <input type="date"> a partir de la fecha guardada en UTC.
export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export function todayInputValue() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const roleLabel = (role) => (role === 'admin' ? 'Administrador' : 'Usuario');

export function roleChips(roles) {
    return roles
        .map((role) => `<span class="chip chip--${role === 'admin' ? 'admin' : 'user'}">${role === 'admin' ? 'admin' : 'user'}</span>`)
        .join('');
}

export { formatClock };
