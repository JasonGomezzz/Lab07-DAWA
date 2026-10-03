import { PASSWORD_RULES, checkPassword } from '/shared/passwordPolicy.js';
import { calculateAge, birthdateError } from '/shared/age.js';
import { guardPage, apiFetch } from '../auth.js';
import {
    boot, initChrome, setBusy, showNotice, setFieldError, clearFieldErrors,
    bindPasswordToggles, clearErrorsOnInput, bindPasswordRules, icon, todayInputValue
} from '../ui.js';

const LAST_EMAIL_KEY = 'salvoconducto.lastEmail';
const PHONE_PATTERN = /^\+?[0-9][0-9 -]{5,18}$/;

function validate(form) {
    const fields = form.elements;
    const value = (name) => fields[name].value.trim();

    if (!value('name')) setFieldError(fields.name, 'Escribe tu nombre.');
    if (!value('lastName')) setFieldError(fields.lastName, 'Escribe tu apellido.');

    if (!value('phoneNumber')) setFieldError(fields.phoneNumber, 'Escribe un teléfono de contacto.');
    else if (!PHONE_PATTERN.test(value('phoneNumber'))) setFieldError(fields.phoneNumber, 'Usa solo dígitos, espacios o guiones (6 a 19).');

    if (!fields.birthdate.value) setFieldError(fields.birthdate, 'Elige tu fecha de nacimiento.');
    else {
        const error = birthdateError(fields.birthdate.value);
        if (error) setFieldError(fields.birthdate, `${error}.`);
    }

    if (!value('email')) setFieldError(fields.email, 'Escribe tu correo.');
    else if (!fields.email.checkValidity()) setFieldError(fields.email, 'Revisa el formato del correo.');

    if (!checkPassword(fields.password.value).valid) {
        setFieldError(fields.password, 'La contraseña aún no cumple todos los requisitos.');
    }

    return form.querySelector('[aria-invalid="true"]');
}

boot(async () => {
    guardPage('guest');
    initChrome(null);

    const form = document.getElementById('form-signup');
    const fields = form.elements;
    const notice = document.querySelector('[data-notice]');
    const submit = form.querySelector('[type="submit"]');
    const rulesList = form.querySelector('[data-password-rules]');
    const ageHint = form.querySelector('[data-age-hint]');

    // Los requisitos salen del mismo módulo que valida el servidor.
    rulesList.innerHTML = PASSWORD_RULES
        .map((rule) => `<li data-rule="${rule.id}"><span class="rule-mark">${icon('check')}</span>${rule.label}</li>`)
        .join('');
    bindPasswordRules(fields.password, rulesList);
    bindPasswordToggles(form);
    clearErrorsOnInput(form);

    fields.birthdate.max = todayInputValue();
    fields.birthdate.addEventListener('input', () => {
        const age = calculateAge(fields.birthdate.value);
        ageHint.textContent = age !== null && age >= 0 ? `${age} años` : '';
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearFieldErrors(form);
        showNotice(notice, {});

        const firstInvalid = validate(form);
        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        const body = {
            name: fields.name.value.trim(),
            lastName: fields.lastName.value.trim(),
            phoneNumber: fields.phoneNumber.value.trim(),
            birthdate: fields.birthdate.value,
            email: fields.email.value.trim(),
            password: fields.password.value
        };

        setBusy(submit, true, 'Creando cuenta…');
        try {
            await apiFetch('/api/auth/signUp', { method: 'POST', body, auth: false });
            window.sessionStorage.setItem(LAST_EMAIL_KEY, body.email.toLowerCase());
            window.location.replace('/signIn?motivo=registro');
        } catch (error) {
            setBusy(submit, false);
            if (/email/i.test(error.message)) {
                setFieldError(fields.email, `${error.message}.`);
                fields.email.focus();
            }
            showNotice(notice, { kind: 'error', title: error.message, items: error.errors });
            notice.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
});
