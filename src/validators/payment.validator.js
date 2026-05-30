export function validatePaymentInput(payload) {
  const body = payload ?? {};
  const errors = [];

  const { reference, amount, card } = body;

  if (typeof reference !== 'string' || reference.trim().length < 6) {
    errors.push('La referencia debe tener al menos 6 caracteres.');
  }

  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isInteger(amount * 100)
  ) {
    errors.push('El monto debe ser un número mayor a 0 con máximo 2 decimales.');
  }

  if (!card || typeof card !== 'object') {
    errors.push('card es obligatoria.');
  } else {
    if (typeof card.number !== 'string' || !/^\d+$/.test(card.number)) {
      errors.push('card.number debe contener solo dígitos.');
    }

    if (typeof card.holder !== 'string' || !card.holder.trim()) {
      errors.push('card.holder es obligatorio.');
    }

    if (typeof card.expiry !== 'string' || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) {
      errors.push('card.expiry debe tener formato MM/YY.');
    }

    if (typeof card.cvv !== 'string' || !/^\d{3,4}$/.test(card.cvv)) {
      errors.push('card.cvv debe contener 3 o 4 dígitos.');
    }
  }

  const normalizedCurrency =
    typeof body.currency === 'string' && body.currency.trim()
      ? body.currency.trim().toUpperCase()
      : 'USD';

  if (body.currency !== undefined && !/^[A-Z]{3}$/.test(normalizedCurrency)) {
    errors.push('currency debe ser un código ISO 4217 válido.');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    data: {
      reference: reference.trim(),
      amount,
      card: {
        number: card.number.trim(),
        holder: card.holder.trim(),
        expiry: card.expiry.trim(),
        cvv: card.cvv.trim()
      },
      currency: normalizedCurrency
    }
  };
}