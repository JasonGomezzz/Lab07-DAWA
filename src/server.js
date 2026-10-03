// dotenv/config va primero: en ESM los import se evalúan antes que el resto del
// archivo, así que dotenv.config() más abajo llegaría tarde para otros módulos.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.routes.js';

const app = express();

// Habilitar CORS para todos
app.use(cors());

app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);

// Validar estado del servidor
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

// Manejador global de errores
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, { autoIndex: true })
    .then(async () => {
        console.log('Mongo connected');
        app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
    })
    .catch(err => {
        console.error('Error al conectar con Mongo:', err);
        process.exit(1);
    });
