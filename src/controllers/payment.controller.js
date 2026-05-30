import { validatePaymentInput } from '../validators/payment.validator.js';
import { processPaymentService } from '../services/payment.service.js';

export const chargePayment = async (req, res) => {
  try {
    const validation = validatePaymentInput(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: validation.errors.join(' ')
      });
    }

    const result = await processPaymentService(validation.data);
    return res.status(result.httpStatus).json(result.body);
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};