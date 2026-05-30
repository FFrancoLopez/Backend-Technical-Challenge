import { Router } from 'express';
import { verifyBearerToken } from '../middleware/auth.middleware.js';
import { chargePayment } from '../controllers/payment.controller.js';

const router = Router();

router.post('/payments/charge', verifyBearerToken, chargePayment);

export default router;