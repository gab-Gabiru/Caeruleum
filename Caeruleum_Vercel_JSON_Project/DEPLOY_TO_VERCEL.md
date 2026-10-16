# Deploy Caeruleum to Vercel (no database)

## 1. Download and extract

Extract `Caeruleum_Vercel_JSON_Project.zip`. The repository root must contain `index.html`, `vercel.json`, `package.json`, `api/`, `assets/`, `data/`, `script.js`, `enhancements.js`, `style.css`, and `vercel-json-api.js`.

## 2. Put it on GitHub

Create a new repository for Caeruleum. Upload the **contents** of this folder to the repository root, not the ZIP itself. Commit the files.

## 3. Import into Vercel

1. Open <https://vercel.com/dashboard>.
2. Click **Add New → Project**.
3. Import the Caeruleum GitHub repository.
4. Choose **Other** as the Framework Preset.
5. Leave Build Command blank. Use `.` (repository root) for Output Directory; if Vercel auto-detects the root, its default is fine.
6. Do not add environment variables; this version needs none.
7. Click **Deploy**.

Vercel automatically treats JavaScript files in `api/` as Functions. The `api/health.js` file exposes the health check at `/api/health`. The rest of the application is static and its demo REST-like requests are handled by `vercel-json-api.js` in the browser. See the Vercel docs for static projects and functions: <https://vercel.com/docs/builds/configure-a-build> and <https://vercel.com/docs/functions/runtimes/node-js>.

## 4. Verify

Open the new Vercel URL, then visit `/api/health`. Expected JSON includes:

```json
{
  "success": true,
  "data": {
    "storageMode": "browser-local-json",
    "database": false,
    "emailDelivery": false,
    "realPayments": false
  }
}
```

Test the app using the demo accounts listed in `README.md`.

## Important limitation

This package deliberately uses no database. Writable app state is serialized into each visitor's browser `localStorage`. It persists for the same browser/device but is **not shared between visitors or devices** and is not secure production authentication. Registration verification codes are displayed in the browser, not emailed. Payment, invoice, escrow, and payout flows are demos only. File uploads are limited to 600 KB each to fit browser storage.


## Photo upload troubleshooting

- This build includes a fix for previously truncated image data URLs and infers image MIME types from supported file extensions when browser metadata is missing.
- Upload JPG/PNG/GIF/WEBP/SVG/AVIF/BMP files up to 600 KB. PSD files are stored as attachments; browsers generally do not render layered PSD files in an `<img>` preview.
- Uploaded image data is saved to the current browser's localStorage. It is not shared with other visitors or devices and may fill browser storage after multiple uploads.
- If an image was uploaded in an older build and remains broken, upload that image again after deploying this version. The old build may have permanently truncated the saved data URL.
- If the sample portfolio artwork is missing too, verify the deployed project contains `index.html`, `assets/`, and `data/` at the Vercel project's root. After deployment, hard-refresh the page with Ctrl+F5. The live `/api/health` route should return JSON, not a PHP content-type response.
