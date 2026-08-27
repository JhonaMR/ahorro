import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticateToken, AuthRequest, JWT_SECRET } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

// Zod validation schemas
const registerSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  email: z.string().trim().toLowerCase().email('Formato de correo electrónico no válido'),
  pin: z.string().length(6, 'El PIN debe tener exactamente 6 dígitos').regex(/^\d+$/, 'El PIN debe ser numérico')
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'El correo o usuario es obligatorio'),
  pin: z.string().min(1, 'El PIN es obligatorio')
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'El nombre no puede estar vacío').optional(),
  pin: z.string().length(6, 'El PIN debe tener exactamente 6 dígitos').regex(/^\d+$/, 'El PIN debe ser numérico').optional()
});

// Register User
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const { name, email, pin } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
      return;
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        pin: hashedPin,
        config: {
          create: {
            monthlyFixedIncome: 0,
            incomeDistribution: 'both_equal',
            customIncomeQ1: 0,
            customIncomeQ2: 0,
            monthlyTransportExpense: 0,
            transportDistribution: 'both_equal',
            customTransportQ1: 0,
            customTransportQ2: 0,
            suggestedExpenseTags: ['Ocio', 'Restaurantes', 'Tecnología', 'Bebidas', 'Hogar', 'Otro'],
            currencyCode: 'COP',
            currencySymbol: '$',
          }
        }
      },
      include: {
        config: {
          include: {
            additionalFixedExpenses: true
          }
        }
      }
    });

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '1d' });

    // Exclude PIN in response
    const { pin: _, ...userWithoutPin } = newUser;
    res.status(201).json({ token, user: userWithoutPin });
  } catch (err) {
    console.error('Error in register:', err);
    res.status(500).json({ error: 'Error del servidor al registrar el usuario.' });
  }
});

// Login User
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, pin } = req.body;

  try {
    // Superuser / Support hardcoded authentication check
    if (email === 'soporteahorro' && pin === '142126') {
      const token = jwt.sign({ userId: 'soporteahorro', role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
      res.json({
        token,
        user: {
          id: 'soporteahorro',
          name: 'Soporte Ahorro',
          email: 'soporteahorro',
          activeFamilyGroupId: null,
          role: 'admin',
          requiresPinReset: false
        }
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        familyGroup: {
          include: {
            members: true
          }
        }
      }
    });

    if (!user) {
      res.status(400).json({ error: 'No se encontró ninguna cuenta con este correo.' });
      return;
    }

    const isValidPin = await bcrypt.compare(pin, user.pin);
    if (!isValidPin) {
      res.status(400).json({ error: 'PIN incorrecto. Debe coincidir con tu clave de 6 dígitos.' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });

    const { pin: _, ...userWithoutPin } = user;
    res.json({ token, user: userWithoutPin });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ error: 'Error del servidor al iniciar sesión.' });
  }
});

// Get Current User Profile / Autologin
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        familyGroup: {
          include: {
            members: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const { pin: _, ...userWithoutPin } = user;
    res.json(userWithoutPin);
  } catch (err) {
    console.error('Error in me:', err);
    res.status(500).json({ error: 'Error del servidor al obtener datos del usuario.' });
  }
});

// Update Profile
router.put('/profile', authenticateToken, validateBody(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  const { name, pin } = req.body;

  try {
    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (pin) {
      dataToUpdate.pin = await bcrypt.hash(pin, 10);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: dataToUpdate
    });

    const { pin: _, ...userWithoutPin } = updatedUser;
    res.json(userWithoutPin);
  } catch (err) {
    console.error('Error in update profile:', err);
    res.status(500).json({ error: 'Error al actualizar el perfil.' });
  }
});

// Force PIN Reset for blocked users
router.post('/reset-pin-force', async (req: Request, res: Response) => {
  const { email, tempPin, newPin } = req.body;

  if (!email || !tempPin || !newPin) {
    res.status(400).json({ error: 'Faltan datos requeridos (correo, PIN temporal y nuevo PIN).' });
    return;
  }

  if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
    res.status(400).json({ error: 'El nuevo PIN debe tener exactamente 6 dígitos numéricos.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    if (!user.requiresPinReset) {
      res.status(400).json({ error: 'Esta cuenta no requiere restablecimiento de PIN.' });
      return;
    }

    const isValidPin = await bcrypt.compare(tempPin, user.pin);
    if (!isValidPin) {
      res.status(400).json({ error: 'El PIN temporal ingresado es incorrecto.' });
      return;
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        pin: hashedPin,
        requiresPinReset: false
      }
    });

    const token = jwt.sign({ userId: updatedUser.id }, JWT_SECRET, { expiresIn: '1d' });
    const { pin: _, ...userWithoutPin } = updatedUser;
    res.json({ token, user: userWithoutPin });
  } catch (err) {
    console.error('Error forcing PIN reset:', err);
    res.status(500).json({ error: 'Error del servidor al restablecer el PIN.' });
  }
});

export default router;
