import authService from '../services/AuthService.js';

// Solo se aceptan textos: un objeto como {"$ne": null} nunca debe llegar a la consulta.
const isText = (value) => typeof value === 'string' && value.trim() !== '';

class AuthController {

    async signUp(req, res, next) {
        try {
            const payload = req.body ?? {};
            if (!isText(payload.email) || !isText(payload.password))
                return res.status(400).json({ message: 'El email y password son requeridos' });

            const user = await authService.signUp(payload);
            return res.status(201).json(user);
        } catch (err) {
            next(err);
        }
    }

    async signIn(req, res, next) {
        try {
            const { email, password } = req.body ?? {};

            if (!isText(email) || !isText(password))
                return res.status(400).json({ message: 'El email y password son requeridos' });

            const token = await authService.signIn({ email, password });
            return res.status(200).json(token);
        } catch (err) {
            next(err);
        }
    }
}

export default new AuthController();
