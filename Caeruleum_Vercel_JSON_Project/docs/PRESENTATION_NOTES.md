# Caeruleum — Presentation Notes

## Project overview

Caeruleum is a creative commission marketplace concept where artists publish service listings and portfolios, clients request commissions, and both sides track status, communicate, and review demo deliverables.

## Technologies

- HTML structures the page and forms.
- CSS handles the black-and-blue identity, responsive layout, cards, dialogs, and navigation.
- JavaScript powers routing, validation, search/filtering, form events, status updates, messages, notifications, analytics, and admin workflows.
- JSON is used for the public starter dataset and the editable application state. In the Vercel edition, editable state is serialized in browser `localStorage` because static deployment files are read-only.
- Vercel hosts the static files and the small `/api/health` function. Other REST-like feature actions run in a browser adapter; there is no live PayPal API or external email sender in this edition.

## Honest scope statement

The assignment permits JSON/local storage and does not require a database. This edition therefore does not integrate Azure SQL, Firebase, or MongoDB. To keep the public demo database-free, each visitor's data remains in that visitor's browser; it does not sync with other visitors. Verification-code and payment interfaces are simulations rather than real external email/payment integrations.

## Demo walkthrough

1. Start at Home and search/filter the Explore listings.
2. Log in as client `client@caeruleum.local` to view commission activity and request a new commission.
3. Log out and log in as artist `artist@caeruleum.local` in the same browser to review requests, update the work, and message the client.
4. Switch back to the client demo account to review the status and demonstrate invoice/payment simulation.
5. Log in as `admin@caeruleum.local` to demonstrate invite codes, artist verification, and the admin portal.
6. Register another demo user to show form validation and the local verification-code step.

The admin portal is a local demo and is not secure server-enforced authorization. PayPal and email verification are simulated, not live integrations.

Passwords listed in the README are public demonstration credentials only.
