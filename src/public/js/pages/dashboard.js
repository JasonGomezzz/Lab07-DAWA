import { guardPage, apiFetch, isAdmin } from '../auth.js';
import {
    boot, initChrome, reveal, renderAvatar, formatDate, formatTime, formatClock, roleChips
} from '../ui.js';

/* --- Zona de lectura mecánica (MRZ) estilo pasaporte ----------------------- */

const mrzText = (value = '') => value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '<');

// Dígito de control ICAO 9303: pesos 7-3-1, letras A=10 … Z=35, relleno "<" = 0.
function checkDigit(text) {
    const weights = [7, 3, 1];
    const sum = [...text].reduce((acc, char, index) => {
        let value = 0;
        if (/[0-9]/.test(char)) value = Number(char);
        else if (/[A-Z]/.test(char)) value = char.charCodeAt(0) - 55;
        return acc + value * weights[index % 3];
    }, 0);
    return String(sum % 10);
}

const yymmdd = (date, utc) => {
    const pad = (n) => String(n).padStart(2, '0');
    const year = utc ? date.getUTCFullYear() : date.getFullYear();
    const month = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
    const day = utc ? date.getUTCDate() : date.getDate();
    return `${pad(year % 100)}${pad(month)}${pad(day)}`;
};

function buildMrz(user, session) {
    const line1 = `P<API${mrzText(user.lastName).replace(/<+$/, '')}<<${mrzText(user.name)}`
        .padEnd(44, '<')
        .slice(0, 44);

    const doc = user.id.slice(-9).toUpperCase();
    const birth = yymmdd(new Date(user.birthdate), true);
    const expiry = yymmdd(new Date(session.expiresAt), false);
    const role = isAdmin(session) ? 'A' : 'U';
    const body = `${doc}${checkDigit(doc)}API${birth}${checkDigit(birth)}${role}${expiry}${checkDigit(expiry)}`
        .padEnd(43, '<');
    const line2 = `${body}${checkDigit(body)}`;

    return `${line1}\n${line2}`;
}

/* --- Anatomía del token ----------------------------------------------------- */

function span(className, text) {
    const el = document.createElement('span');
    el.className = className;
    el.textContent = text;
    return el;
}

function renderTokenRaw(container, token) {
    const [header, payload, signature] = token.split('.');
    container.replaceChildren(
        span('seg-header', header),
        span('seg-dot', '.'),
        span('seg-payload', payload),
        span('seg-dot', '.'),
        span('seg-signature', `${signature.slice(0, 12)}…`)
    );
}

// Payload con una nota legible junto a iat y exp.
function renderPayload(container, payload) {
    const keys = Object.keys(payload);
    const nodes = ['{\n'];
    keys.forEach((key, index) => {
        const comma = index < keys.length - 1 ? ',' : '';
        nodes.push(`  "${key}": ${JSON.stringify(payload[key])}${comma}`);
        if (key === 'iat') nodes.push(span('note', `  // emitido ${formatTime(payload.iat * 1000)}`));
        if (key === 'exp') nodes.push(span('note', `  // caduca ${formatTime(payload.exp * 1000)}`));
        nodes.push('\n');
    });
    nodes.push('}');
    container.replaceChildren(...nodes);
}

/* --- Vigencia ------------------------------------------------------------- */

function startValidity(session) {
    const clock = document.querySelector('[data-validity-left]');
    const bar = document.querySelector('[data-validity-bar]');
    const text = document.querySelector('[data-validity-text]');
    const total = session.expiresAt - session.issuedAt;

    text.textContent = `Emitido a las ${formatTime(session.issuedAt)} y válido hasta las ${formatTime(session.expiresAt)}. `
        + 'Al llegar a cero la sesión se cierra sola y vuelves a /signIn.';

    const tick = () => {
        const left = Math.max(0, session.expiresAt - Date.now());
        clock.textContent = formatClock(left);
        bar.style.transform = `scaleX(${total > 0 ? left / total : 0})`;
        bar.parentElement.classList.toggle('is-low', left < 5 * 60 * 1000);
    };
    tick();
    setInterval(tick, 1000);
}

/* --- Página --------------------------------------------------------------- */

function fill(user, session) {
    const set = (field, value, { empty = 'Sin registrar' } = {}) => {
        const el = document.querySelector(`[data-field="${field}"]`);
        el.textContent = value || empty;
        el.classList.toggle('is-empty', !value);
    };

    document.querySelector('[data-first-name]').textContent = `${user.name.split(' ')[0]}.`;
    set('docNumber', `N.º ${user.id.slice(-9).toUpperCase()}`);
    set('lastName', user.lastName);
    set('name', user.name);
    set('email', user.email);
    set('phoneNumber', user.phoneNumber);
    set('birthdate', formatDate(user.birthdate, { utc: true }));
    set('age', user.age !== null && user.age !== undefined ? `${user.age} años` : '');
    set('createdAt', formatDate(user.createdAt));
    set('address', user.address);
    document.querySelector('[data-field="roles"]').innerHTML = roleChips(user.roles);

    renderAvatar(document.querySelector('[data-avatar]'), user);
    document.querySelector('[data-stamp-time]').textContent = `HASTA ${formatTime(session.expiresAt)}`;
    document.querySelector('[data-mrz]').textContent = buildMrz(user, session);

    const passport = document.querySelector('[data-passport]');
    passport.classList.remove('is-loading');
    passport.removeAttribute('aria-busy');
}

boot(async () => {
    const session = guardPage('user');
    initChrome(session);
    reveal();

    renderTokenRaw(document.querySelector('[data-token-raw]'), session.token);
    document.querySelector('[data-token-header]').textContent = JSON.stringify(session.header, null, 2);
    renderPayload(document.querySelector('[data-token-payload]'), session.payload);
    startValidity(session);

    const user = await apiFetch('/api/users/me');
    fill(user, session);
});
