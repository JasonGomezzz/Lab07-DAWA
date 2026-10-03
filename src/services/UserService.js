import mongoose from 'mongoose';
import userRepository from '../repositories/UserRepository.js';
import { assertPasswordPolicy, hashPassword, comparePassword } from '../utils/password.js';
import { birthdateError } from '../utils/age.js';
import httpError from '../utils/httpError.js';

// Lista blanca de PUT /api/users/me: email, roles y password no se editan por aquí.
const EDITABLE_FIELDS = ['name', 'lastName', 'phoneNumber', 'birthdate', 'url_profile', 'address'];
const OPTIONAL_FIELDS = ['url_profile', 'address'];

function toPublicUser(user) {
    return {
        id: String(user._id),
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        birthdate: user.birthdate,
        age: user.age,
        url_profile: user.url_profile ?? '',
        address: user.address ?? '',
        roles: user.roles.filter(Boolean).map(r => r.name ?? String(r)),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

// Convierte el body en un update de Mongo con solo los campos permitidos.
function buildProfileUpdate(body) {
    const $set = {};
    const $unset = {};

    for (const field of EDITABLE_FIELDS) {
        if (!(field in body)) continue;
        const raw = body[field];
        if (raw !== null && typeof raw !== 'string') {
            throw httpError(400, `El campo ${field} debe ser texto`);
        }
        const value = (raw ?? '').trim();
        if (value === '' && OPTIONAL_FIELDS.includes(field)) $unset[field] = 1;
        else $set[field] = value;
    }

    if ('birthdate' in $set) {
        const error = birthdateError($set.birthdate);
        if (error) throw httpError(400, error);
    }

    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    return Object.keys(update).length ? update : null;
}

class UserService {

    async getAll() {
        const users = await userRepository.getAll();
        return users.map(toPublicUser);
    }

    async getById(id) {
        const user = mongoose.isValidObjectId(id) ? await userRepository.findById(id) : null;
        if (!user) throw httpError(404, 'Usuario no encontrado');
        return toPublicUser(user);
    }

    async updateMe(id, body = {}) {
        const update = buildProfileUpdate(body);
        const wantsNewPassword = typeof body.password === 'string' && body.password !== '';
        if (!update && !wantsNewPassword) throw httpError(400, 'No se enviaron datos para actualizar');

        const current = await userRepository.findById(id);
        if (!current) throw httpError(404, 'Usuario no encontrado');

        // Se valida todo antes de escribir para no dejar cambios a medias.
        // 400 y no 401: un 401 haría que el frontend cierre la sesión.
        if (wantsNewPassword) {
            const ok = typeof body.currentPassword === 'string'
                && await comparePassword(body.currentPassword, current.password);
            if (!ok) throw httpError(400, 'La contraseña actual no es correcta');
            assertPasswordPolicy(body.password);
        }

        if (update) await userRepository.updateById(id, update);
        if (wantsNewPassword) await userRepository.updatePassword(id, await hashPassword(body.password));

        return this.getById(id);
    }
}

export default new UserService();
