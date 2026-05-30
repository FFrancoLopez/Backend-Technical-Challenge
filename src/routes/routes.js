import { Router } from 'express';
import authRoutes from './auth.routes.js';
import paymentRoutes from './payment.routes.js';

const router = Router();

router.use(authRoutes);
router.use(paymentRoutes);

export default router;