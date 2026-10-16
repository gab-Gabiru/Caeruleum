# Caeruleum Manual and Smoke Test Plan

Open the deployed Vercel URL, or preview the repository root in VS Code with a local static web server such as Live Server. Do not open `index.html` directly with the `file://` protocol.

| ID | Test | Expected result |
|---|---|---|
| T01 | Open the home page | Logo, hero, featured cards, and navigation render without an API error |
| T02 | Open Explore | Seeded listings render; search text and category filters dynamically narrow the list |
| T03 | Submit a registration with mismatched passwords | Browser validation / toast blocks the registration |
| T04 | Register a new client with a valid email and password | Local verification modal displays a six-digit demo code; invite code is not required for clients |
| T04a | Choose Artist without entering an invite code | Registration is blocked before the email-code modal opens |
| T04b | Enter an invalid or used artist invite code | Registration is rejected before the email-code modal opens |
| T04c | Register an artist with a valid unused invite code and correct email code | Artist account becomes verified, code is consumed, and two new invite codes are created for that artist |
| T05 | Enter an incorrect code | Registration is rejected and the user remains unregistered |
| T06 | Enter the correct code | Account is saved to browser-local JSON (`localStorage`), password is hashed in the demo adapter, and a browser-local session begins |
| T07 | Sign out and sign back in | Session is cleared and a valid email/password creates a new session |
| T08 | Sign in as artist demo | Artist Portal shows queue, listings, portfolio, and analytics |
| T09 | Create a listing | New listing persists to browser-local JSON and appears in the marketplace |
| T10 | Upload portfolio artwork | File data URL and portfolio metadata are saved in browser-local JSON and shown on the profile |
| T11 | Sign in as client demo | Client portal shows commission history; client can create a new request |
| T12 | Sign in as artist demo and accept requested commission | Status changes to `accepted` and is persisted |
| T13 | Sign in as client and record demo payment | The local invoice and simulated payment record appear; no external provider is called |
| T14 | Sign in as artist, start production, then submit draft for review | Workflow status progresses and history is appended |
| T15 | Add commission comment and send message | Comment / message persists and creates a notification |
| T16 | Upload commission file | The upload data URL is stored in browser-local JSON and linked to the commission |
| T17 | Sign in as admin | Admin dashboard shows users, invite codes, audit entries, and local integration logs |
| T18 | Admin generates a master invite code | Code appears in admin registry and can be used once |
| T18a | Open portal as a verified artist | Two artist-owned invite codes are visible and can be shared with new artists |
| T18b | Attempt to use a redeemed invite code again | Registration is rejected as invalid/already used |
| T19 | Edit profile / change password | New data persists and the new password signs in successfully |
| T20 | Refresh the page | Listings, users, commissions, messages, and notifications persist in the same browser |
| T21 | Open `/api/health` | JSON shows `storageMode: browser-local-json`, `database: false`, and `externalServices: false` |
| T22 | Resize browser to mobile width | Header wraps, grids collapse appropriately, and forms remain accessible |

## Smoke-test limitations

The local demo verification code is not emailed. The demo payment/payout workflow changes local records only. These are explicit substitutions for the prior cloud authentication/payment plan and are not production payment or email integrations.
