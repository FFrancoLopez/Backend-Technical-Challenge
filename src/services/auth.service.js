import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env.js';

export function authenticateClient(clientId, clientSecret) {
  const { validClientId, validClientSecret } = getConfig();
  return clientId === validClientId && clientSecret === validClientSecret;
}

export function createAccessToken(payload) {
  const { jwtSecret, tokenExpirySeconds } = getConfig();

  return jwt.sign(payload, jwtSecret, {
    expiresIn: tokenExpirySeconds
  });
}