import mongoose from 'mongoose';
import { calculateAge, birthdateError } from '../utils/age.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 -]{5,18}$/;

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre es requerido'],
        trim: true,
        maxlength: [60, 'El nombre admite hasta 60 caracteres']
    },
    lastName: {
        type: String,
        required: [true, 'El apellido es requerido'],
        trim: true,
        maxlength: [60, 'El apellido admite hasta 60 caracteres']
    },
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [EMAIL_PATTERN, 'El email no tiene un formato válido']
    },
    // Aquí solo llega el hash de bcrypt. La política (8 caracteres, mayúscula,
    // dígito y especial) se valida en el servicio antes de hashear: sobre el hash
    // ya no se puede comprobar.
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: [true, 'El teléfono es requerido'],
        trim: true,
        match: [PHONE_PATTERN, 'El teléfono solo admite dígitos, espacios, guiones y un + inicial (6 a 19 caracteres)']
    },
    birthdate: {
        type: Date,
        required: [true, 'La fecha de nacimiento es requerida'],
        cast: 'La fecha de nacimiento no es válida',
        validate: {
            validator: (value) => birthdateError(value) === null,
            message: (props) => birthdateError(props.value)
        }
    },
    url_profile: {
        type: String,
        trim: true,
        validate: {
            // Solo http(s): evita guardar "javascript:..." que luego se pinte como enlace o imagen.
            validator: (value) => !value || /^https?:\/\/\S+$/i.test(value),
            message: 'La URL de perfil debe empezar con http:// o https://'
        }
    },
    address: {
        type: String,
        trim: true,
        maxlength: [120, 'La dirección admite hasta 120 caracteres']
    },
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }]
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        versionKey: false,
        // Nunca se serializa el hash, aunque alguien olvide filtrarlo en el servicio.
        transform: (doc, ret) => {
            delete ret._id;
            delete ret.password;
            return ret;
        }
    }
});

UserSchema.virtual('age').get(function () {
    return calculateAge(this.birthdate);
});

export default mongoose.model('User', UserSchema);
