# Caeruleum photo display fix

## Root causes addressed

1. Uploaded files are allowed up to 600 KB, but Base64 data URLs for images at that size can exceed 800,000 characters. The previous adapter truncated profile photo and portfolio/deliverable URLs at 800,000 characters, corrupting some otherwise valid images. Those fields now allow up to 1,000,000 characters.
2. A few browser/file-picker combinations can report a generic or empty MIME type. The adapter now infers common image MIME types from extensions and classifies them as previewable images. PSD is intentionally excluded from inline image previews.
3. Script cache-busting query strings were updated so browsers request the fixed client code after redeployment.

## Verification performed

- JavaScript syntax checks pass.
- Simulated a 590 KiB JPEG (805,571-character data URL), uploaded it to the portfolio, and confirmed the full URL persisted without truncation and was classified as an image.
- Tested `.png` extension MIME inference when the browser reports `application/octet-stream`.
- Checked that every image URL in `data/seed.json` refers to an asset included in `assets/`.

## Deploy / existing data

Deploy the project contents with `index.html`, `assets/`, `data/`, `script.js`, and `vercel-json-api.js` at the Vercel root. Then hard-refresh with Ctrl+F5. If photos were already corrupted by the old 800,000-character limit, re-upload those particular files; the missing Base64 tail cannot be reconstructed.

## Limitations

Uploads live only in the current browser's localStorage and are not shared with other visitors or devices. PSD files are attachments rather than browser-rendered previews.
