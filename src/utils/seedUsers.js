import roleRepository from '../repositories/RoleRepository.js';
import userRepository from '../repositories/UserRepository.js';
import { checkPassword } from './passwordPolicy.js';
import { hashPassword } from './password.js';

// Crea el administrador inicial con los datos de .env. Es idempotente: si el email
// ya existe no hace nada, y nunca promueve a admin una cuenta registrada por el
// formulario público (alguien podría haberse adelantado con ese email).
export default async function seedUsers() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.warn('seedUsers: define ADMIN_EMAIL y ADMIN_PASSWORD en .env para crear el administrador');
        return;
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
        if (!existing.roles.some(r => r.name === 'admin')) {
            console.warn(`seedUsers: ${email} ya existe sin rol admin; no se promueve automáticamente`);
        }
        return;
    }

    const { valid, errors } = checkPassword(password);
    if (!valid) {
        console.warn(`seedUsers: ADMIN_PASSWORD no cumple la política (${errors.join('; ')})`);
        return;
    }

    const adminRole = await roleRepository.findByName('admin')
        ?? await roleRepository.create({ name: 'admin' });

    await userRepository.create({
        name: process.env.ADMIN_NAME || 'Administrador',
        lastName: process.env.ADMIN_LASTNAME || 'Principal',
        email,
        password: await hashPassword(password),
        phoneNumber: process.env.ADMIN_PHONE || '999000000',
        birthdate: process.env.ADMIN_BIRTHDATE || '1990-01-01',
        roles: [adminRole._id]
    });
    console.log(`Seeded admin: ${email}`);
}
