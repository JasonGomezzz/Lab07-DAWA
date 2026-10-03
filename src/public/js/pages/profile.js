import { PASSWORD_RULES, checkPassword } from '/shared/passwordPolicy.js';
import { calculateAge, birthdateError } from '/shared/age.js';
import { guardPage, apiFetch } from '../auth.js';
import {
    boot, initChrome, reveal, toast, setBusy, showNotice, setFieldError, clearFieldErrors,
    clearErrorsOnInput, bindPasswordToggles, bindPasswordRules, renderAvatar, icon, roleChips,
    fullName, formatDate, formatDateTime, toDateInput, todayInputValue, roleLabel
} from '../ui.js';

const EDITABLE = ['name', 'lastName', 'phoneNumber', 'birthdate', 'url_profile', 'address'];
const PHONE_PATTERN = /^\+?[0-9][0-9 -]{5,18}$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;

let saved = {};

const readForm = (fields) => Object.fromEntries(EDITABLE.map((key) => [key, fields[key].value.trim()]));

function snapshot(user) {
    return {
        name: user.name,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        birthdate: toDateInput(user.birthdate),
        url_profile: user.url_profile || '',
        address: user.address || ''
    };
}

function renderSummary(user) {
    const set = (key, value) => { document.querySelector(`[data-summary="${key}"]`).textContent = value; };
    set('fullName', fullName(user));
    set('email', user.email);
    set('age', user.age !== null && user.age !== undefined ? `${user.age} años` : '—');
    set('createdAt', formatDate(user.createdAt));
    set('updatedAt', formatDateTime(user.updatedAt));
    set('id', user.id);
    document.querySelector('[data-summary="roles"]').innerHTML = roleChips(user.roles);
    renderAvatar(document.querySelector('[data-avatar]'), user);
    document.querySelector('[data-summary-card]').classList.remove('is-loading');
}

function fillForm(fields, user) {
    saved = snapshot(user);
    EDITABLE.forEach((key) => { fields[key].value = saved[key]; });
    document.getElementById('email').value = user.email;
    document.getElementById('roles').value = user.roles.map(roleLabel).join(', ');
}

function validateProfile(fields) {
    const values = readForm(fields);
    if (!values.name) setFieldError(fields.name, 'El nombre es obligatorio.');
    if (!values.lastName) setFieldError(fields.lastName, 'El apellido es obligatorio.');
    if (!values.phoneNumber) setFieldError(fields.phoneNumber, 'El teléfono es obligatorio.');
    else if (!PHONE_PATTERN.test(values.phoneNumber)) setFieldError(fields.phoneNumber, 'Usa solo dígitos, espacios o guiones (6 a 19).');
    const birthError = values.birthdate ? birthdateError(values.birthdate) : 'La fecha de nacimiento es obligatoria';
    if (birthError) setFieldError(fields.birthdate, `${birthError}.`);
    if (values.url_profile && !URL_PATTERN.test(values.url_profile)) {
        setFieldError(fields.url_profile, 'Debe empezar con http:// o https://.');
    }
    return values;
}

function setupProfileForm(user) {
    const form = document.getElementById('form-perfil');
    const fields = form.elements;
    const notice = document.querySelector('[data-notice="perfil"]');
    const submit = form.querySelector('[type="submit"]');
    const discard = form.querySelector('[data-action="discard"]');
    const ageHint = form.querySelector('[data-age-hint]');
    let current = user;

    const changedFields = () => {
        const values = readForm(fields);
        return EDITABLE.filter((key) => values[key] !== saved[key]);
    };
    const refreshState = () => {
        const dirty = changedFields().length > 0;
        submit.disabled = !dirty;
        discard.hidden = !dirty;
        const age = calculateAge(fields.birthdate.value);
        ageHint.textContent = age !== null && age >= 0 ? `${age} años` : '';
    };
    const previewAvatar = () => {
        const url = fields.url_profile.value.trim();
        renderAvatar(document.querySelector('[data-avatar]'), {
            ...current,
            name: fields.name.value || current.name,
            lastName: fields.lastName.value || current.lastName,
            url_profile: URL_PATTERN.test(url) ? url : ''
        });
    };

    fillForm(fields, user);
    fields.birthdate.max = todayInputValue();
    refreshState();
    clearErrorsOnInput(form);

    form.addEventListener('input', (event) => {
        refreshState();
        if (['url_profile', 'name', 'lastName'].includes(event.target.name)) previewAvatar();
    });

    discard.addEventListener('click', () => {
        fillForm(fields, current);
        clearFieldErrors(form);
        showNotice(notice, {});
        refreshState();
        previewAvatar();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearFieldErrors(form);
        showNotice(notice, {});

        const values = validateProfile(fields);
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        // Solo viajan los campos que cambiaron; el servidor igual aplica su lista blanca.
        const body = Object.fromEntries(changedFields().map((key) => [key, values[key]]));

        setBusy(submit, true, 'Guardando…');
        try {
            current = await apiFetch('/api/users/me', { method: 'PUT', body });
            fillForm(fields, current);
            renderSummary(current);
            toast('Tus datos se guardaron.', 'ok');
        } catch (error) {
            showNotice(notice, { kind: 'error', title: error.message, items: error.errors });
        } finally {
            setBusy(submit, false);
            refreshState();
        }
    });
}

function setupPasswordForm() {
    const form = document.getElementById('form-clave');
    const fields = form.elements;
    const notice = document.querySelector('[data-notice="clave"]');
    const submit = form.querySelector('[type="submit"]');
    const rulesList = form.querySelector('[data-password-rules]');

    rulesList.innerHTML = PASSWORD_RULES
        .map((rule) => `<li data-rule="${rule.id}"><span class="rule-mark">${icon('check')}</span>${rule.label}</li>`)
        .join('');
    bindPasswordRules(fields.password, rulesList);
    bindPasswordToggles(form);
    clearErrorsOnInput(form);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearFieldErrors(form);
        showNotice(notice, {});

        const currentPassword = fields.currentPassword.value;
        const password = fields.password.value;
        if (!currentPassword) setFieldError(fields.currentPassword, 'Escribe tu contraseña actual.');
        if (!checkPassword(password).valid) setFieldError(fields.password, 'La nueva contraseña aún no cumple todos los requisitos.');
        else if (password === currentPassword) setFieldError(fields.password, 'La nueva contraseña debe ser distinta de la actual.');

        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        setBusy(submit, true, 'Actualizando…');
        try {
            await apiFetch('/api/users/me', { method: 'PUT', body: { currentPassword, password } });
            form.reset();
            fields.password.dispatchEvent(new Event('input'));
            showNotice(notice, {
                kind: 'ok',
                title: 'Contraseña actualizada. Úsala la próxima vez que ingreses; tu token actual sigue vigente hasta que caduque.'
            });
        } catch (error) {
            if (error.status === 400 && /actual/i.test(error.message)) {
                setFieldError(fields.currentPassword, `${error.message}.`);
                fields.currentPassword.focus();
            } else {
                showNotice(notice, { kind: 'error', title: error.message, items: error.errors });
            }
        } finally {
            setBusy(submit, false);
        }
    });
}

boot(async () => {
    const session = guardPage('user');
    initChrome(session);
    reveal();

    setupPasswordForm();
    const user = await apiFetch('/api/users/me');
    renderSummary(user);
    setupProfileForm(user);
});
