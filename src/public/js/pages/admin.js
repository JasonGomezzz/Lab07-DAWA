import { guardPage, apiFetch } from '../auth.js';
import {
    boot, initChrome, reveal, toast, showNotice, renderAvatar, roleChips, fullName,
    formatDate, formatTime, formatDateTime, icon
} from '../ui.js';

const WEEK = 7 * 24 * 60 * 60 * 1000;

const state = { users: [], query: '', filter: 'all' };

const normalize = (text = '') => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isAdminUser = (user) => user.roles.includes('admin');

function el(tag, { className, text, attrs } = {}, children = []) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, value));
    node.append(...children);
    return node;
}

/* --- Resumen ------------------------------------------------------------- */

function renderSummary(users) {
    const admins = users.filter(isAdminUser).length;
    const recent = users.filter((u) => Date.now() - new Date(u.createdAt).getTime() < WEEK).length;
    const ages = users.map((u) => u.age).filter((age) => typeof age === 'number');
    const average = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;

    const plural = (n, one, many) => `${n === 1 ? one : many}`;
    const parts = [
        [users.length, plural(users.length, 'titular registrado', 'titulares registrados')],
        [admins, plural(admins, 'administrador', 'administradores')],
        [recent, plural(recent, 'alta en los últimos 7 días', 'altas en los últimos 7 días')]
    ];

    const summary = document.querySelector('[data-summary]');
    summary.replaceChildren();
    parts.forEach(([value, label], index) => {
        summary.append(el('strong', { text: String(value) }), ` ${label}`);
        summary.append(index < parts.length - 1 ? ', ' : '');
    });
    if (average !== null) summary.append(' y una edad promedio de ', el('strong', { text: String(average) }), ' años.');
    else summary.append('.');

    document.querySelector('[data-count="all"]').textContent = users.length;
    document.querySelector('[data-count="admin"]').textContent = admins;
    document.querySelector('[data-count="user"]').textContent = users.length - admins;
}

/* --- Tabla --------------------------------------------------------------- */

function visibleUsers() {
    const query = normalize(state.query.trim());
    return state.users.filter((user) => {
        if (state.filter === 'admin' && !isAdminUser(user)) return false;
        if (state.filter === 'user' && isAdminUser(user)) return false;
        if (!query) return true;
        return normalize(`${fullName(user)} ${user.email}`).includes(query);
    });
}

function userRow(user, index) {
    const avatar = el('span', { className: 'avatar avatar--row' });
    renderAvatar(avatar, user);

    const holder = el('div', { className: 'holder' }, [
        avatar,
        el('div', {}, [
            el('strong', { text: fullName(user) }),
            el('span', { className: 'mono', text: user.email })
        ])
    ]);

    const roles = el('td', { attrs: { 'data-label': 'Rol' } });
    roles.innerHTML = roleChips(user.roles);

    const view = el('button', {
        className: 'btn btn-line btn-sm',
        attrs: { type: 'button', 'data-view': user.id, 'aria-label': `Ver la ficha de ${fullName(user)}` }
    });
    view.innerHTML = `<span>Ver</span>${icon('eye')}`;

    return el('tr', {}, [
        el('td', { className: 'idx', text: String(index + 1).padStart(2, '0') }),
        el('td', { className: 'holder-cell', attrs: { 'data-label': 'Titular' } }, [holder]),
        el('td', { className: 'num', text: user.phoneNumber, attrs: { 'data-label': 'Teléfono' } }),
        el('td', { className: 'num', text: user.age ?? '—', attrs: { 'data-label': 'Edad' } }),
        roles,
        el('td', { className: 'when', attrs: { 'data-label': 'Registro' } }, [
            formatDate(user.createdAt),
            el('span', { text: formatTime(user.createdAt) })
        ]),
        el('td', { className: 'actions' }, [view])
    ]);
}

function renderRows() {
    const tbody = document.querySelector('[data-rows]');
    const users = visibleUsers();

    if (!users.length) {
        const message = state.query
            ? `Ningún titular coincide con «${state.query.trim()}».`
            : 'No hay titulares con ese rol.';
        tbody.replaceChildren(el('tr', { className: 'ledger-empty' }, [
            el('td', { attrs: { colspan: '7' } }, [
                el('strong', { text: 'Sin resultados' }),
                message
            ])
        ]));
        return;
    }
    // La numeración sigue el orden del registro completo, no el del filtro.
    tbody.replaceChildren(...users.map((user) => userRow(user, state.users.indexOf(user))));
}

/* --- Ficha (modal) --------------------------------------------------------- */

function setDetail(key, value, { empty = 'Sin registrar' } = {}) {
    const node = document.querySelector(`[data-detail="${key}"]`);
    node.textContent = value || empty;
    node.classList.toggle('is-empty', !value);
}

async function openDetail(id, modal) {
    const ficha = document.querySelector('[data-ficha]');
    ficha.classList.add('is-loading');
    ['email', 'phoneNumber', 'birthdate', 'age', 'address', 'url_profile', 'createdAt', 'updatedAt']
        .forEach((key) => { document.querySelector(`[data-detail="${key}"]`).textContent = ''; });
    document.querySelector('[data-detail="roles"]').replaceChildren();
    setDetail('fullName', 'Cargando ficha…');
    setDetail('id', `ID ${id}`);
    setDetail('endpoint', `GET /api/users/${id}`);
    modal.open();

    try {
        const user = await apiFetch(`/api/users/${encodeURIComponent(id)}`);
        setDetail('fullName', fullName(user));
        setDetail('email', user.email);
        setDetail('phoneNumber', user.phoneNumber);
        setDetail('birthdate', formatDate(user.birthdate, { utc: true }));
        setDetail('age', user.age !== null && user.age !== undefined ? `${user.age} años` : '');
        setDetail('address', user.address);
        setDetail('url_profile', user.url_profile);
        setDetail('createdAt', formatDateTime(user.createdAt));
        setDetail('updatedAt', formatDateTime(user.updatedAt));
        document.querySelector('[data-detail="roles"]').innerHTML = roleChips(user.roles);
        renderAvatar(document.querySelector('[data-detail-avatar]'), user);
        ficha.classList.remove('is-loading');
    } catch (error) {
        modal.close();
        toast(error.status === 404 ? 'Ese usuario ya no existe en el registro.' : error.message, 'error');
    }
}

/* --- Página ----------------------------------------------------------------- */

// En Materialize 2.4 Modal.open() quedó vacío: el modal es un <dialog> nativo con la
// clase .modal, así que se abre con showModal() (foco atrapado y Escape incluidos).
function setupDialog(dialog) {
    const close = () => dialog.close();
    dialog.querySelectorAll('.modal-close').forEach((button) => button.addEventListener('click', close));
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) close();
    });
    dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
    return {
        open() {
            document.body.style.overflow = 'hidden';
            if (!dialog.open) dialog.showModal();
        },
        close
    };
}

boot(async () => {
    const session = guardPage('admin');
    initChrome(session);
    reveal();

    const modal = setupDialog(document.getElementById('ficha'));
    const notice = document.querySelector('[data-notice]');

    document.getElementById('buscar').addEventListener('input', (event) => {
        state.query = event.target.value;
        renderRows();
    });

    document.querySelectorAll('[data-filter]').forEach((button) => {
        button.addEventListener('click', () => {
            state.filter = button.dataset.filter;
            document.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
            renderRows();
        });
    });

    document.querySelector('[data-rows]').addEventListener('click', (event) => {
        const button = event.target.closest('[data-view]');
        if (button) openDetail(button.dataset.view, modal);
    });

    try {
        state.users = await apiFetch('/api/users');
        renderSummary(state.users);
        renderRows();
    } catch (error) {
        document.querySelector('[data-rows]').replaceChildren();
        document.querySelector('[data-summary]').textContent = 'No se pudo leer el registro.';
        showNotice(notice, { kind: 'error', title: error.message });
    }
});
