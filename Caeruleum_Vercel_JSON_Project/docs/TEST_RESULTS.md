# Caeruleum Vercel Edition — Test Results

## Static checks

- `node --check script.js` — passed.
- `node --check enhancements.js` — passed.
- `node --check vercel-json-api.js` — passed.
- `node --check api/health.js` — passed.
- `data/seed.json` parses as valid JSON and does not include seeded password hash/salt fields.
- No npm packages or environment variables are required for the browser-local demo.
- Theme is black-and-blue; logo, buttons, labels, statuses, and analytics accents use blue/semantic colors.
- Artist registration requires a valid, unused invite code; client registration remains open.
- Successful artist registration consumes the code once and creates two single-use codes owned by that artist.
- Previously saved browser demo data is upgraded once to provide existing verified artists with their invite pair.

## Invite workflow harness

- Automated adapter test passed for missing-code rejection, invalid-code rejection before the email demo opens, valid-code redemption, rejection of reuse, automatic creation of two invite codes for a new artist, migration of existing verified artists to two owned codes, and client registration without an invite code.

## Runtime / deployment checks still required

After deployment, manually check:

1. Visit `/` and confirm the homepage renders with black-and-blue styling.
2. Visit `/api/health`; expect `success: true` and `storageMode: browser-local-json`.
3. Log in with each sample role and verify the appropriate demo portal appears.
4. Search and filter Explore listings.
5. As a client, create a commission request; switch to the artist demo account in the same browser and process the request.
6. Demonstrate the simulated commission/payment lifecycle and send a message.
7. Register a client without an invite code and complete the local verification-code step.
8. Attempt artist registration without a code or with an invalid/used code; both must be rejected.
9. Register an artist with a valid unused code and confirm it becomes used and the artist receives two new codes. Confirm a redeemed code cannot be reused.
10. Refresh the page and confirm data persists in the same browser.
11. Open the site in a different browser/private window to confirm it has a separate data copy. This is expected with no database.
12. Re-capture screenshots so the documentation reflects the black-and-blue theme.

## Limitations

The package has not been tested against the user's actual Vercel deployment in this environment. Real email delivery, real payment processing, server-enforced authentication/authorization, and shared multi-user storage are not included. `GET /api/health` is the only actual server endpoint; other feature route behavior is browser-emulated.


## Photo upload regression checks

- 590 KiB JPEG upload generated an 805,571-character data URL and persisted fully in the artist portfolio (no 800,000-character truncation).
- Image with generic `application/octet-stream` browser MIME but `.png` extension was inferred as `image/png`.
- Portfolio upload classified supported raster/vector image formats for display; PSD remains an attachment because browsers do not render PSD in `<img>`.
