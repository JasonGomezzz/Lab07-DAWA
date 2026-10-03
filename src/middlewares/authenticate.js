import jwt from 'jsonwebtoken';

export default function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith('Bearer '))
            return res.status(401).json({ message: 'No autorizado' });

        const token = header.split(' ')[1];
        // Se fija HS256 para no aceptar tokens firmados con otro algoritmo (ni "none").
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        req.userId = payload.sub;
        req.userRoles = payload.roles || [];
        next();

    } catch (err) {
        return res.status(401).json({ message: 'Token no válido o caducado' });
    }
}
