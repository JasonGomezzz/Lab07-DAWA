import express from 'express';

const router = express.Router();

// El token vive en sessionStorage y el navegador no lo envía al pedir una página,
// así que el servidor no sabe quién la pide: estas rutas solo entregan la vista.
// Cada página se protege en el navegador (public/js/auth.js) y los datos los
// protege la API con authenticate y authorize.
const page = (view, locals) => (req, res) => res.render(view, locals);

router.get('/', (req, res) => res.redirect('/signIn'));

router.get('/signIn', page('signIn', { title: 'Iniciar sesión', guard: 'guest', nav: 'guest', current: 'signIn' }));
router.get('/signUp', page('signUp', { title: 'Crear cuenta', guard: 'guest', nav: 'guest', current: 'signUp' }));

// Rol user o superior (admin también entra)
router.get('/dashboard', page('dashboard', { title: 'Mi panel', guard: 'user', nav: 'app', current: 'dashboard' }));
router.get('/profile', page('profile', { title: 'Mi cuenta', guard: 'user', nav: 'app', current: 'profile' }));

// Solo rol admin
router.get('/admin/dashboard', page('admin/dashboard', { title: 'Registro de titulares', guard: 'admin', nav: 'app', current: 'admin' }));

export function pageNotFound(req, res) {
    res.status(404).render('404', {
        title: 'Página no encontrada',
        guard: 'public',
        nav: 'auto',
        requestedPath: req.originalUrl
    });
}

export default router;
