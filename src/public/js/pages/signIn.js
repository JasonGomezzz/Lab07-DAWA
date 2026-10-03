import { guardPage, apiFetch, saveToken, getSession, homeFor } from '../auth.js';
import {
    boot, initChrome, setBusy, showNotice, setFieldError, clearFieldErrors, bindPasswordToggles, clearErrorsOnInput
} from '../ui.js';

const LAST_EMAIL_KEY = 'salvoconducto.lastEmail';

// Mensajes según el motivo con el que se llegó a /signIn.
const REASONS = {
    expirada: { kind: 'info', title: 'Tu sesión caducó. Vuelve a ingresar para continuar.' },
    invalida: { kind: 'error', title: 'El servidor rechazó tu token (caducado o alterado). Vuelve a ingresar.' },
    salida: { kind: 'ok', title: 'Cerraste sesión. El token se borró de esta pestaña.' },
    registro: { kind: 'ok', title: 'Cuenta creada. Ingresa con tu correo y contraseña.' },
    requerida: { kind: 'info', title: 'Inicia sesión para entrar a esa página.' }
};

boot(async () => {
    guardPage('guest');
    initChrome(null);

    const form = document.getElementById('form-signin');
    const notice = document.querySelector('[data-notice]');
    const submit = form.querySelector('[type="submit"]');

    const params = new URLSearchParams(window.location.search);
    const reason = REASONS[params.get('motivo')];
    if (reason) showNotice(notice, reason);
    if (params.has('motivo')) window.history.replaceState(null, '', '/signIn');

    const lastEmail = window.sessionStorage.getItem(LAST_EMAIL_KEY);
    if (lastEmail) {
        form.email.value = lastEmail;
        window.sessionStorage.removeItem(LAST_EMAIL_KEY);
        form.password.focus();
    }

    bindPasswordToggles(form);
    clearErrorsOnInput(form);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearFieldErrors(form);

        const email = form.email.value.trim();
        const password = form.password.value;

        if (!email) setFieldError(form.email, 'Escribe tu correo.');
        else if (!form.email.checkValidity()) setFieldError(form.email, 'Revisa el formato del correo.');
        if (!password) setFieldError(form.password, 'Escribe tu contraseña.');

        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        setBusy(submit, true, 'Verificando…');
        try {
            const { token } = await apiFetch('/api/auth/signIn', {
                method: 'POST',
                body: { email, password },
                auth: false
            });
            saveToken(token);
            // Redirige al dashboard que corresponde al rol que trae el token.
            window.location.replace(homeFor(getSession()));
        } catch (error) {
            setBusy(submit, false);
            if (error.status === 401) {
                showNotice(notice, { kind: 'error', title: 'Correo o contraseña incorrectos.' });
                form.password.select();
            } else {
                showNotice(notice, { kind: 'error', title: error.message, items: error.errors });
            }
        }
    });
});
