import express from 'express';

const router = express.Router();

// El token vive en sessionStorage y el navegador no lo envía al pedir una página,
// así que el servidor no sabe quién la pide: estas rutas solo entregan la vista.
// Cada página se protege en el navegador (public/js/auth.js) y los datos los
// protege la API con authenticate y authorize.
const page = (view, locals) => (req, res) => res.render(view, locals);

router.get('/', (req, res) => res.redirect('/signIn'));

router.get('/signIn', page('signIn', { title: 'Iniciar sesión', guard: 'guest', nav: 'guest', current: 'signIn' }));

export function pageNotFound(req, res) {
    res.status(404).render('404', {
        title: 'Página no encontrada',
        guard: 'public',
        nav: 'auto',
        requestedPath: req.originalUrl
    });
}

export default router;
