import crypto from 'crypto';
import { getConfig } from '../config/env.js';
import { getTransactions, saveTransactions } from '../config/db.js';

export async function processPaymentService(paymentData) {
  const config = getConfig();
  const { reference, amount, card, currency } = paymentData;
  const normalizedCurrency = currency.toUpperCase();
  const brand = detectCardBrand(card.number);

  const transactions = await getTransactions();

  const duplicateExists = transactions.some((transaction) => transaction.reference === reference);

  if (duplicateExists) {
    const duplicateRecord = createTransactionRecord({
      reference,
      amount,
      currency: normalizedCurrency,
      card,
      brand: brand ?? 'unsupported',
      status: 'declined',
      declineReason: 'DUPLICATE_REFERENCE'
    });

    return {
      httpStatus: 409,
      body: buildResponse(duplicateRecord, {
        error: 'DUPLICATE_REFERENCE',
        message: 'Ya existe una transacción con esa referencia.'
      })
    };
  }

  if (!brand) {
    return persistDecline({
      transactions,
      reference,
      amount,
      currency: normalizedCurrency,
      card,
      brand: 'unsupported',
      declineReason: 'UNSUPPORTED_CARD_BRAND',
      message: 'La tarjeta no pertenece a una red soportada.'
    });
  }

  if (!isValidPanLengthForBrand(brand, card.number)) {
    return persistDecline({
      transactions,
      reference,
      amount,
      currency: normalizedCurrency,
      card,
      brand,
      declineReason: 'INVALID_CARD_NUMBER',
      message: 'El número de tarjeta no es válido para la red detectada.'
    });
  }

  if (!isValidCvvLengthForBrand(brand, card.cvv)) {
    return {
      httpStatus: 400,
      body: {
        error: 'VALIDATION_ERROR',
        message: 'El CVV no es válido para la red detectada.'
      }
    };
  }

  if (isCardExpired(card.expiry)) {
    return persistDecline({
      transactions,
      reference,
      amount,
      currency: normalizedCurrency,
      card,
      brand,
      declineReason: 'CARD_EXPIRED',
      message: 'La tarjeta está vencida.'
    });
  }

  const isWhitelistedCard = isApprovedCard(card, config);

  if (!isWhitelistedCard) {
    if (amount < 10) {
      return persistDecline({
        transactions,
        reference,
        amount,
        currency: normalizedCurrency,
        card,
        brand,
        declineReason: 'AMOUNT_BELOW_MINIMUM',
        message: 'El monto está por debajo del mínimo permitido.'
      });
    }

    if (amount > 100) {
      return persistDecline({
        transactions,
        reference,
        amount,
        currency: normalizedCurrency,
        card,
        brand,
        declineReason: 'AMOUNT_EXCEEDS_LIMIT',
        message: 'El monto supera el máximo permitido.'
      });
    }
  }

  const approvedRecord = createTransactionRecord({
    reference,
    amount,
    currency: normalizedCurrency,
    card,
    brand,
    status: 'approved',
    declineReason: null
  });

  await saveTransactions([...transactions, approvedRecord]);

  return {
    httpStatus: 200,
    body: buildResponse(approvedRecord)
  };
}

async function persistDecline({
  transactions,
  reference,
  amount,
  currency,
  card,
  brand,
  declineReason,
  message
}) {
  const declinedRecord = createTransactionRecord({
    reference,
    amount,
    currency,
    card,
    brand,
    status: 'declined',
    declineReason
  });

  await saveTransactions([...transactions, declinedRecord]);

  return {
    httpStatus: 422,
    body: buildResponse(declinedRecord, {
      error: 'UNPROCESSABLE',
      message
    })
  };
}

function detectCardBrand(cardNumber) {
  if (/^4\d{12}(\d{3})?$/.test(cardNumber)) {
    return 'visa';
  }

  if (isMastercard(cardNumber)) {
    return 'mastercard';
  }

  if (/^3[47]\d{13}$/.test(cardNumber)) {
    return 'amex';
  }

  return null;
}

function isMastercard(cardNumber) {
  if (!/^\d{16}$/.test(cardNumber)) {
    return false;
  }

  const prefix2 = Number(cardNumber.slice(0, 2));
  const prefix4 = Number(cardNumber.slice(0, 4));

  return (prefix2 >= 51 && prefix2 <= 55) || (prefix4 >= 2221 && prefix4 <= 2720);
}

function isValidPanLengthForBrand(brand, cardNumber) {
  switch (brand) {
    case 'visa':
      return cardNumber.length === 13 || cardNumber.length === 16;
    case 'mastercard':
      return cardNumber.length === 16;
    case 'amex':
      return cardNumber.length === 15;
    default:
      return false;
  }
}

function isValidCvvLengthForBrand(brand, cvv) {
  return brand === 'amex' ? cvv.length === 4 : cvv.length === 3;
}

function isCardExpired(expiry) {
  const [monthRaw, yearRaw] = expiry.split('/');
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (!month || !year) {
    return true;
  }

  const fullYear = 2000 + year;
  const expiryDate = new Date(fullYear, month, 0, 23, 59, 59, 999);

  return expiryDate < new Date();
}

function isApprovedCard(card, config) {
  const { approvedCard } = config;

  return (
    card.number === approvedCard.number &&
    card.holder === approvedCard.holder &&
    card.expiry === approvedCard.expiry &&
    card.cvv === approvedCard.cvv
  );
}

function createTransactionRecord({
  reference,
  amount,
  currency,
  card,
  brand,
  status,
  declineReason
}) {
  return {
    transaction_id: crypto.randomUUID(),
    reference,
    status,
    decline_reason: declineReason,
    card_brand: brand,
    card_number: maskCardNumber(card.number),
    amount: Number(amount.toFixed(2)),
    currency,
    card_holder: card.holder,
    created_at: new Date().toISOString()
  };
}

function buildResponse(record, extra = {}) {
  const { card_holder, ...safeRecord } = record;
  return {
    ...safeRecord,
    ...extra
  };
}

function maskCardNumber(cardNumber) {
  return `${cardNumber.slice(0, 5)} **** ${cardNumber.slice(-4)}`;
}