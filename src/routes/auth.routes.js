import { Router } from 'express';
import { login } from '../controllers/auth.controller.js';

const router = Router();

router.post('/auth/token', login);

export default router;