// dotenv/config va primero: en ESM los import se evalúan antes que el resto del
// archivo, así que dotenv.config() más abajo llegaría tarde para otros módulos.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import seedRoles from './utils/seedRoles.js';
import seedUsers from './utils/seedUsers.js';
import errorHandler, { apiNotFound } from './middlewares/errorHandler.js';

// Sin estas variables el servidor arrancaría y fallaría recién al firmar el primer token.
const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((name) => !process.env[name]);
if (missing.length) {
    console.error(`Faltan variables de entorno: ${missing.join(', ')}. Copia .env.example a .env y complétalo.`);
    process.exit(1);
}

const app = express();

// Habilitar CORS para todos
app.use(cors());

app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Validar estado del servidor
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

// Rutas /api inexistentes responden 404 en JSON
app.use('/api', apiNotFound);

// Manejador global de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, { autoIndex: true })
    .then(async () => {
        console.log('Mongo connected');
        await seedRoles();
        await seedUsers();
        app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
    })
    .catch(err => {
        console.error('Error al conectar con Mongo:', err);
        process.exit(1);
    });
