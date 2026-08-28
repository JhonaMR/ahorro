import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes';
import personalRoutes from './routes/personal.routes';
import familyRoutes from './routes/family.routes';
import adminRoutes from './routes/admin.routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegurar existencia de la carpeta de subidas de códigos QR
const uploadsDir = path.join(__dirname, '../uploads/qrs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3040;

// Habilitar confianza en proxies inversos para obtener la IP real del cliente
app.set('trust proxy', true);

// Middlewares de Seguridad y CORS
app.use(helmet({
  contentSecurityPolicy: false, // Desactivar CSP para evitar problemas con la carga de estilos/scripts de React
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Limitador de peticiones para evitar fuerza bruta en el Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Ajustado a 10 (un término medio seguro entre usabilidad y protección de fuerza bruta)
  message: { error: 'Demasiados intentos de inicio de sesión. Por favor intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar limitador únicamente al endpoint de login
app.use('/api/auth/login', loginLimiter);

// Rutas de la Aplicación
app.use('/api/auth', authRoutes);
app.use('/api', personalRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/admin', adminRoutes);

// Servir frontend en producción
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  
  // Cualquier ruta que no coincida con la API servirá el index.html de React
  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Ruta de API no encontrada' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Middleware Global de Manejo de Errores
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error Global Capturado:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Ha ocurrido un error inesperado en el servidor.'
  });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
