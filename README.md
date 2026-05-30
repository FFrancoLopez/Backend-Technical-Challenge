# Payment Flow API

API REST para simular un flujo de pago end-to-end con autenticación por token, validaciones de tarjeta y persistencia local.

## Stack

* Node.js
* Express
* JWT
* Base de datos local en archivo JSON
* Jest + Supertest

## Requisitos

* Node.js 18 o superior
* npm

## Instalación

```bash
npm install
```

Crear un archivo `.env` utilizando como referencia `.env.example`.

Ejecutar en modo desarrollo:

```bash
npm run dev
```

Ejecutar pruebas:

```bash
npm test
```

---

# Arquitectura del Proyecto

```text
src/
├── config/
│   └── db.js
│   └── env.js
├── controllers/
│   ├── auth.controller.js
│   └── payment.controller.js
├── middleware/
│   └── auth.middleware.js
├── routes/
│   └── routes.js
├── services/
│   └── payment.service.js
├── validators/
│   └── payment.validator.js
├── app.js
└── server.js
```

### Responsabilidades

* **Routes:** definición de endpoints.
* **Controllers:** manejo de requests y responses.
* **Middleware:** validación del token JWT.
* **Services:** implementación de reglas de negocio.
* **Validators:** validación de datos de entrada.
* **Config:** configuración y persistencia local.

---

# Flujo General

## 1. Autenticación

El cliente solicita un token JWT utilizando sus credenciales.

```http
POST /auth/token
```

Si las credenciales son válidas se genera un token firmado con JWT.

---

## 2. Procesamiento de Pago

El cliente envía una solicitud de pago utilizando el token obtenido.

```http
POST /payments/charge
Authorization: Bearer <token>
```

El sistema valida:

1. Token JWT.
2. Estructura del request.
3. Referencia única.
4. Marca de tarjeta.
5. Longitud del PAN.
6. Fecha de expiración.
7. Reglas de monto.
8. Tarjeta whitelist.
9. Persistencia de la transacción.

Finalmente retorna una respuesta aprobada o rechazada.

---

# Endpoint: Obtener Token

## Request

```http
POST /auth/token
```

### Body

```json
{
  "client_id": "payment_client",
  "client_secret": "s3cr3t_key"
}
```

### Respuesta Exitosa

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Error

```json
{
  "error": "UNAUTHORIZED"
}
```

---

# Endpoint: Procesar Pago

## Request

```http
POST /payments/charge
```

### Headers

```http
Authorization: Bearer <jwt>
```

### Body

```json
{
  "reference": "PAY001",
  "amount": 50,
  "currency": "USD",
  "card": {
    "number": "4111111111111111",
    "holder": "TEST USER",
    "expiry": "12/29",
    "cvv": "123"
  }
}
```

---

# Reglas de Negocio

## Detección de Marca

Tarjetas soportadas:

* Visa
* Mastercard
* American Express

Si la marca no es reconocida:

```json
{
  "status": "declined",
  "decline_reason": "UNSUPPORTED_CARD_BRAND"
}
```

---

## Validación de PAN

Se valida la longitud según cada marca:

| Marca      | Longitud |
| ---------- | -------- |
| Visa       | 13 o 16  |
| Mastercard | 16       |
| Amex       | 15       |

---

## Validación de Fecha

Las tarjetas vencidas son rechazadas.

```json
{
  "status": "declined",
  "decline_reason": "CARD_EXPIRED"
}
```

---

## Validación de Monto

Monto mínimo:

```text
10.00 USD
```

Monto máximo:

```text
100.00 USD
```

Errores posibles:

```text
AMOUNT_BELOW_MINIMUM
AMOUNT_EXCEEDS_LIMIT
```

---

## Referencias Duplicadas

No se permiten referencias repetidas.

```json
{
  "error": "DUPLICATE_REFERENCE"
}
```

---

## Tarjeta Whitelist

Existe una tarjeta configurada mediante variables de entorno que puede utilizarse para validar escenarios positivos durante las pruebas.

---

## Persistencia de Datos

Para simplificar la ejecución y evaluación del challenge, la aplicación utiliza una base de datos local basada en archivos JSON.

Las transacciones procesadas se almacenan en un archivo local configurado mediante la variable de entorno:

```env
DB_PATH=./data/payments.db.json
```

Este enfoque permite:

* Ejecutar el proyecto sin dependencias externas.
* Mantener persistencia entre reinicios de la aplicación.
* Facilitar la revisión y pruebas por parte del evaluador.
* Simular una capa de almacenamiento para las transacciones procesadas.

La información almacenada incluye:

* transaction_id
* reference
* status
* decline_reason
* amount
* currency
* card_brand
* card_number (enmascarado)
* card_holder
* created_at

Por razones de seguridad, nunca se almacena el número completo de la tarjeta. Únicamente se conservan los primeros 6 y últimos 4 dígitos.


---

# Seguridad

* Autenticación mediante JWT.
* Validación de Bearer Token.
* No se almacena el PAN completo.
* No se exponen datos sensibles en las respuestas.
* Variables sensibles configuradas mediante `.env`.

---

# Testing

Las pruebas automáticas cubren:

* Generación de token.
* Credenciales inválidas.
* Pago aprobado.
* Pago rechazado por monto.
* Tarjeta expirada.
* Referencia duplicada.
* Marca no soportada.
* Longitud inválida de PAN.
* Validación de JWT.
* Validaciones de entrada.

Ejecutar:

```bash
npm test
```

---

# Colección Postman

La colección Postman incluida en el repositorio permite probar todos los escenarios de negocio de forma rápida.

Incluye:

* Obtención de token.
* Pagos aprobados.
* Pagos rechazados.
* Validaciones.
* Casos de error.
* Referencias duplicadas.
* Autenticación.
  
## Nota para el evaluador

1. Ejecutar primero la petición **Endpoint de Autenticación**.
2. Copiar el valor de `access_token` obtenido.
3. Reemplazar el token utilizado en las peticiones protegidas.
4. Ejecutar las pruebas del endpoint `/payments/charge`.

Esto garantiza que todas las solicitudes se realicen con un JWT válido.
