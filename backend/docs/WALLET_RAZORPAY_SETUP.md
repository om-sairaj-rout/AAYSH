# Wallet Razorpay integration

## API endpoints

### Standard Checkout (generic)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/create-order` | Cookie (`checkAuth`) | Create Razorpay order (`amount` in **paise**, min 100) |
| POST | `/api/verify-payment` | Cookie | Verify `razorpay_order_id` + `razorpay_payment_id` + `razorpay_signature` |

Shared logic: `backend/utils/razorpayCheckoutService.js`. Frontend helper: `frontend/src/utils/razorpayCheckout.js`.

### Wallet recharge (production flow)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/wallet/recharges` | Cookie + `orders` write | Create pending recharge + Razorpay order |
| POST | `/api/wallet/recharges/verify` | Cookie + `orders` write | Verify checkout signature + credit wallet |
| POST | `/api/wallet/recharges/cancel` | Cookie + `orders` write | Mark pending recharge cancelled (checkout dismissed) |
| POST | `/api/wallet/razorpay/webhook` | Razorpay signature header | Async payment confirmation (raw JSON body) |
| POST | `/api/wallet/admin/adjust` | Admin + `settings` write | Manual credit/debit (not Razorpay) |

## Environment variables

- `RAZORPAY_KEY_ID` — Key ID from Razorpay Dashboard (Test or Live).
- `RAZORPAY_KEY_SECRET` — Key secret (server only; never expose to frontend).
- `RAZORPAY_WEBHOOK_SECRET` — Webhook secret from Razorpay Dashboard when creating the webhook.

Copy `backend/.env.example` into `backend/.env` and fill values.

**If recharge fails immediately:** open `backend/.env` and confirm these lines exist (not commented) with your Test keys:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
```

Restart the backend after saving. On startup you should **not** see `[razorpay] Wallet recharge unavailable`.

For local frontend, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL=http://localhost:3000` (or rely on the dev default to `localhost:3000`).

## Razorpay Dashboard webhook

1. **URL:** `https://<your-backend-host>/api/wallet/razorpay/webhook`  
   Local testing: use a tunnel (e.g. ngrok) → `https://<subdomain>.ngrok.io/api/wallet/razorpay/webhook`
2. **Events:** at minimum `payment.captured` and `payment.failed` (optional: `order.paid`).
3. Set the webhook **secret** to match `RAZORPAY_WEBHOOK_SECRET`.

## Idempotency

- Wallet credit runs only once per `rechargeId` (unique wallet transaction per recharge).
- Duplicate `providerPaymentId` is blocked at the database level.
- Completed recharges ignore repeat verify/webhook calls.

## Local test flow

1. Use Razorpay **Test Mode** keys.
2. Start backend (`npm run dev`) and frontend.
3. Wallet → Recharge → pay with Razorpay test card `4111 1111 1111 1111`, any future expiry, any CVV.
4. Confirm balance increases and Recharges tab shows **Success**.
