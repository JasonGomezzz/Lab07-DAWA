// Páginas 403 y 404: ajustan la navegación y los botones según haya sesión o no.
import { guardPage, homeFor, logout, NavigationAbort } from '../auth.js';
import { boot, initChrome, roleChips } from '../ui.js';

boot(async () => {
    const session = guardPage('public');
    initChrome(session);

    const home = document.querySelector('[data-home-link]');
    if (home) {
        const label = home.querySelector('[data-label]') ?? home.firstChild;
        home.href = session ? homeFor(session) : '/signIn';
        label.textContent = session ? 'Volver a mi panel' : 'Ir a iniciar sesión';
    }

    // Solo en el 403
    const from = new URLSearchParams(window.location.search).get('desde');
    const fromTag = document.querySelector('[data-from]');
    if (fromTag && from && from.startsWith('/')) {
        fromTag.textContent = from;
        const required = document.querySelector('[data-required]');
        if (required && !from.startsWith('/admin')) required.firstChild.textContent = 'Rol requerido: superior';
    }

    const roleLine = document.querySelector('[data-role-line]');
    if (roleLine && session) {
        roleLine.querySelector('[data-my-roles]').innerHTML = roleChips(session.roles);
        roleLine.hidden = false;
    }

    const switchAccount = document.querySelector('[data-action="switch-account"]');
    if (switchAccount && session) {
        switchAccount.hidden = false;
        switchAccount.addEventListener('click', () => {
            try {
                logout('salida');
            } catch (error) {
                if (!(error instanceof NavigationAbort)) throw error;
            }
        });
    }
});
