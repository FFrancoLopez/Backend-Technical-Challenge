import request from 'supertest';
import app from '../src/app.js';
import { resetDb } from '../src/config/db.js';

describe('Payment Flow API', () => {
  beforeAll(() => {
    process.env.DB_PATH = './data/test-payments.db.json';
    process.env.JWT_SECRET = 'test_secret';
    process.env.VALID_CLIENT_ID = 'payment_client';
    process.env.VALID_CLIENT_SECRET = 's3cr3t_key';
    process.env.APPROVED_CARD_NUMBER = '4111111111111111';
    process.env.APPROVED_CARD_HOLDER = 'TEST USER';
    process.env.APPROVED_CARD_EXPIRY = '12/29';
    process.env.APPROVED_CARD_CVV = '123';
    process.env.TOKEN_EXPIRY_SECONDS = '3600';
  });

  beforeEach(async () => {
    await resetDb();
  });

  async function getToken() {
    const response = await request(app)
      .post('/auth/token')
      .send({
        client_id: 'payment_client',
        client_secret: 's3cr3t_key'
      });

    expect(response.status).toBe(200);
    expect(response.body.access_token).toBeDefined();

    return response.body.access_token;
  }

  test('POST /auth/token returns a token', async () => {
    const response = await request(app)
      .post('/auth/token')
      .send({
        client_id: 'payment_client',
        client_secret: 's3cr3t_key'
      });

    expect(response.status).toBe(200);
    expect(response.body.token_type).toBe('Bearer');
    expect(response.body.expires_in).toBe(3600);
    expect(typeof response.body.access_token).toBe('string');
  });

  test('POST /auth/token rejects invalid credentials', async () => {
    const response = await request(app)
      .post('/auth/token')
      .send({
        client_id: 'bad',
        client_secret: 'bad'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('UNAUTHORIZED');
  });

  test('POST /payments/charge approves whitelist card with low amount', async () => {
    const token = await getToken();

    const response = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REF001',
        amount: 5.0,
        currency: 'USD',
        card: {
          number: '4111111111111111',
          holder: 'TEST USER',
          expiry: '12/29',
          cvv: '123'
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('approved');
    expect(response.body.decline_reason).toBeNull();
    expect(response.body.reference).toBe('REF001');
  });

  test('POST /payments/charge declines amount below minimum', async () => {
    const token = await getToken();

    const response = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REF002',
        amount: 5.0,
        currency: 'USD',
        card: {
          number: '4000000000000002',
          holder: 'JOHN DOE',
          expiry: '12/29',
          cvv: '123'
        }
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('UNPROCESSABLE');
    expect(response.body.decline_reason).toBe('AMOUNT_BELOW_MINIMUM');
    expect(response.body.status).toBe('declined');
  });

  test('POST /payments/charge declines amount above limit', async () => {
    const token = await getToken();

    const response = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REF003',
        amount: 150.0,
        currency: 'USD',
        card: {
          number: '4000000000000002',
          holder: 'JOHN DOE',
          expiry: '12/29',
          cvv: '123'
        }
      });

    expect(response.status).toBe(422);
    expect(response.body.decline_reason).toBe('AMOUNT_EXCEEDS_LIMIT');
  });

  test('POST /payments/charge rejects duplicate reference', async () => {
    const token = await getToken();

    const first = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REFDUP1',
        amount: 10.0,
        currency: 'USD',
        card: {
          number: '4000000000000002',
          holder: 'JOHN DOE',
          expiry: '12/29',
          cvv: '123'
        }
      });

    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REFDUP1',
        amount: 10.0,
        currency: 'USD',
        card: {
          number: '4000000000000002',
          holder: 'JOHN DOE',
          expiry: '12/29',
          cvv: '123'
        }
      });

    expect(second.status).toBe(409);
    expect(second.body.error).toBe('DUPLICATE_REFERENCE');
    expect(second.body.decline_reason).toBe('DUPLICATE_REFERENCE');
  });

  test('POST /payments/charge approves a valid Mastercard', async () => {
    const token = await getToken();

    const response = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REF004',
        amount: 10.0,
        currency: 'USD',
        card: {
          number: '5500005555555559',
          holder: 'CARD HOLDER',
          expiry: '12/29',
          cvv: '123'
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.card_brand).toBe('mastercard');
    expect(response.body.status).toBe('approved');
  });

  test('POST /payments/charge approves a valid Amex', async () => {
    const token = await getToken();

    const response = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REF005',
        amount: 10.0,
        currency: 'USD',
        card: {
          number: '378282246310005',
          holder: 'CARD HOLDER',
          expiry: '12/29',
          cvv: '1234'
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.card_brand).toBe('amex');
    expect(response.body.status).toBe('approved');
  });

  test('POST /payments/charge declines expired card', async () => {
    const token = await getToken();

    const response = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REF006',
        amount: 10.0,
        currency: 'USD',
        card: {
          number: '4111111111111111',
          holder: 'TEST USER',
          expiry: '04/20',
          cvv: '123'
        }
      });

    expect(response.status).toBe(422);
    expect(response.body.decline_reason).toBe('CARD_EXPIRED');
  });

  test('POST /payments/charge declines invalid PAN length', async () => {
    const token = await getToken();

    const response = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REF007',
        amount: 10.0,
        currency: 'USD',
        card: {
          number: '41111111111',
          holder: 'TEST USER',
          expiry: '12/29',
          cvv: '123'
        }
      });

    expect(response.status).toBe(422);
    expect(response.body.decline_reason).toBe('INVALID_CARD_NUMBER');
  });

  test('POST /payments/charge declines unsupported brand', async () => {
    const token = await getToken();

    const response = await request(app)
      .post('/payments/charge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: 'REF008',
        amount: 10.0,
        currency: 'USD',
        card: {
          number: '6011000990139424',
          holder: 'TEST USER',
          expiry: '12/29',
          cvv: '123'
        }
      });

    expect(response.status).toBe(422);
    expect(response.body.decline_reason).toBe('UNSUPPORTED_CARD_BRAND');
  });

  test('POST /payments/charge rejects missing or invalid token', async () => {
    const response = await request(app)
      .post('/payments/charge')
      .send({
        reference: 'REF009',
        amount: 10.0,
        currency: 'USD',
        card: {
          number: '4111111111111111',
          holder: 'TEST USER',
          expiry: '12/29',
          cvv: '123'
        }
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('UNAUTHORIZED');
  });
});