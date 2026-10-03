import jwt from 'jsonwebtoken';
import userRepository from '../repositories/UserRepository.js';
import roleRepository from '../repositories/RoleRepository.js';
import { assertPasswordPolicy, hashPassword, comparePassword } from '../utils/password.js';
import httpError from '../utils/httpError.js';

const normalizeEmail = (email) => String(email).trim().toLowerCase();

class AuthService {

    // El registro público siempre asigna el rol "user": cualquier "roles" del body se
    // ignora. Los administradores solo se crean con seedUsers.
    async signUp({ name, lastName, email, password, phoneNumber, birthdate, url_profile, address }) {
        assertPasswordPolicy(password);

        const normalizedEmail = normalizeEmail(email);
        const existing = await userRepository.findByEmail(normalizedEmail);
        if (existing) throw httpError(400, 'El email ya se encuentra en uso');

        const userRole = await roleRepository.findByName('user')
            ?? await roleRepository.create({ name: 'user' });

        const user = await userRepository.create({
            name,
            lastName,
            email: normalizedEmail,
            password: await hashPassword(password),
            phoneNumber,
            birthdate,
            url_profile,
            address,
            roles: [userRole._id]
        });

        return {
            id: user._id,
            email: user.email,
            name: user.name,
            lastName: user.lastName,
            roles: [userRole.name]
        };
    }

    async signIn({ email, password }) {
        const user = await userRepository.findByEmail(normalizeEmail(email));
        if (!user) throw httpError(401, 'Credenciales inválidas');

        const ok = await comparePassword(password, user.password);
        if (!ok) throw httpError(401, 'Credenciales inválidas');

        const token = jwt.sign(
            {
                sub: String(user._id),
                roles: user.roles.map(r => r.name)
            },
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        );

        return { token };
    }
}

export default new AuthService();
