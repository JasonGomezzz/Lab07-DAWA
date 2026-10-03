import User from '../models/User.js';

class UserRepository {
    async create(userData) {
        const user = new User(userData);
        return user.save();
    }

    async findByEmail(email) {
        return User.findOne({ email }).populate('roles').exec();
    }

    async findById(id) {
        return User.findById(id).populate('roles').exec();
    }

    async updatePassword(id, hashedPassword) {
        return User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true }).exec();
    }

    // runValidators para que las reglas del esquema también apliquen al editar.
    async updateById(id, update) {
        return User.findByIdAndUpdate(id, update, { new: true, runValidators: true })
            .populate('roles')
            .exec();
    }

    // El listado nunca necesita el hash: se excluye desde la consulta.
    async getAll() {
        return User.find().select('-password').populate('roles').sort({ createdAt: -1 }).exec();
    }
}

export default new UserRepository();
