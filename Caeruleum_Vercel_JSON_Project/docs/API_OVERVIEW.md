# Caeruleum API/data overview — Vercel browser-JSON edition

The public demo uses one real Vercel endpoint, `GET /api/health`, to confirm that the deployment is online. It does not expose a server-side PayPal API or real account/payment endpoints. The feature workflows in the existing frontend call a compatibility adapter in `vercel-json-api.js` rather than making server requests. The adapter presents REST-style routes (`bootstrap.php`, `auth.php`, `listings.php`, `commissions.php`, and others) to the frontend, but processes them in the browser.

## Data flow

1. On the first visit, the browser downloads the sanitized, read-only starter dataset at `data/seed.json`.
2. The adapter stores a JSON representation of the working demo state in `localStorage` under `caeruleum.vercel.json.v1`.
3. Registration, listings, commissions, messages, notifications, invoices, and admin demo actions update that browser-local JSON state.
4. The current demo session is stored separately in browser storage. Artist registration requires an unused invite code; registering or verifying an artist creates two invite codes owned by that artist. Codes are checked and consumed only inside the browser-local demo state; one browser cannot enforce global single-use across multiple visitors.
5. Uploaded files are converted to data URLs and saved into the JSON state, with a 600 KB per-file cap to avoid quickly exhausting browser storage.

## Limitations

- Browser-local storage is not an actual shared server database. A visitor's data does not appear on other devices or in other people's browser storage.
- The seed JSON is public and is not an authentication secret.
- The admin portal and its role checks run in the browser-local prototype. Client-side sessions and password checks are for demonstration only and can be bypassed; they are not secure production authorization.
- Verification codes are visible demo codes; no email is delivered.
- Payments/invoices/escrow/payouts are simulated; no money is processed.
- The JSON state can be cleared by the visitor from browser site data or with `caeruleumResetBrowserData()` in the developer console.
