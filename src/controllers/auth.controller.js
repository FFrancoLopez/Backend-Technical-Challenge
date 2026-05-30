import { authenticateClient, createAccessToken } from '../services/auth.service.js';
import { getConfig } from '../config/env.js';

export const login = async (req, res) => {
  try {
    const { client_id, client_secret } = req.body ?? {};

    if (
      typeof client_id !== 'string' ||
      typeof client_secret !== 'string' ||
      !client_id.trim() ||
      !client_secret.trim()
    ) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'client_id y client_secret son obligatorios.'
      });
    }

    if (!authenticateClient(client_id.trim(), client_secret.trim())) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const { tokenExpirySeconds } = getConfig();
    const token = createAccessToken({ client_id: client_id.trim() });

    return res.status(200).json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: tokenExpirySeconds
    });
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};