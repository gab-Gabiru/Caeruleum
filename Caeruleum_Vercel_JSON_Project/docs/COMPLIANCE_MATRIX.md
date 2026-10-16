# Integrative Programming Technologies — Requirement Matrix

The assignment guide requires an original title, at least five major sections, HTML/CSS/JavaScript, interactivity and validation, optional data persistence, responsiveness, working controls, a GitHub repository with README, screenshots, and a final code presentation.

| Assignment requirement | Caeruleum implementation | Status / what remains |
|---|---|---|
| Original project title | Caeruleum — Creative Commission Marketplace | Included in the title and branding |
| Five major pages/sections minimum | Home, Explore, Account, Artist Profile, Artist Portal, Client Portal, Commission Detail, Messages, Admin Portal | Included (9 major sections) |
| HTML, CSS, JavaScript | `index.html`, `style.css`, `script.js`, `enhancements.js`, `vercel-json-api.js` | Included |
| Interactive features / event handling | Search/filter, forms, validation, registration/login, commission status workflow, messages, and admin actions | Included as client-side demo workflows |
| Data handling and validation | Public `data/seed.json` starter file and browser JSON state saved to `localStorage` | Included; browser-local only, not shared or production-secure |
| Database integration | Explicitly optional in the assignment; no database is used in this edition | Meets the no-database choice |
| Responsive and usable UI | Responsive layouts and CSS media queries | Included; manually check on the final deployed URL |
| Links, buttons, forms work properly | Browser adapter implements demo workflows; `/api/health` is the single real remote endpoint | Core code paths have static/smoke checks; manually test all controls after deployment |
| GitHub repository and README | `README.md` contains title, category, description, features, technologies, demo accounts, and limitations | Student must upload the project to their own GitHub repository and replace the student-name placeholder |
| Website screenshots | `docs/screenshots/` contains major-section screenshots | Included, but screenshots are from the earlier monochrome styling; recapture them after deploying the black-and-blue theme |
| Presentation and code explanation | `docs/PRESENTATION_NOTES.md`, `docs/API_OVERVIEW.md`, and this matrix | Materials included; student must prepare and deliver the presentation |

## Important scope distinctions

- **Admin portal:** Present, with demo user management, artist verification, invite-code generation, audit log, and integration-log view. Authorization is client-side and can be bypassed; it is not a secure server-enforced admin system.
- **API:** The only real Vercel endpoint is `GET /api/health`. Other REST-like actions are emulated in `vercel-json-api.js` in the browser to support the no-database requirement.
- **PayPal:** No live PayPal SDK, REST API, order creation/capture, or webhook is configured. Payment, invoice, escrow, and payout buttons are simulations only.
- **Email verification:** The code is displayed to the user locally. The app does not send email.
- **Multi-user data:** Each browser stores its own copy of JSON state; it does not synchronize accounts or changes across devices/visitors.

The guide says database use is optional and grades functionality, technology integration, UI, data handling, code quality, GitHub/README, and presentation. The project has code and documentation for the listed criteria, but the repository upload and presentation remain student tasks, and real payment/email integrations are not part of this no-database build.
