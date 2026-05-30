export function getConfig() {
  const tokenExpirySecondsRaw = Number.parseInt(process.env.TOKEN_EXPIRY_SECONDS ?? '3600', 10);
  const tokenExpirySeconds = Number.isFinite(tokenExpirySecondsRaw) ? tokenExpirySecondsRaw : 3600;

  return {
    port: Number.parseInt(process.env.PORT ?? '3000', 10) || 3000,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    jwtSecret: process.env.JWT_SECRET ?? 'super_secret_jwt_key',
    tokenExpirySeconds,
    validClientId: process.env.VALID_CLIENT_ID ?? 'payment_client',
    validClientSecret: process.env.VALID_CLIENT_SECRET ?? 's3cr3t_key',
    approvedCard: {
      number: (process.env.APPROVED_CARD_NUMBER ?? '4111111111111111').replace(/\s+/g, ''),
      holder: process.env.APPROVED_CARD_HOLDER ?? 'TEST USER',
      expiry: process.env.APPROVED_CARD_EXPIRY ?? '12/29',
      cvv: process.env.APPROVED_CARD_CVV ?? '123'
    },
    dbPath: process.env.DB_PATH ?? './data/payments.db.json'
  };
}