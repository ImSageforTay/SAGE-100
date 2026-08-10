# PROJECT: SAGE-100

A simple installable web app for the 100-day quest system.

## Run locally

Because the service worker requires a web server, don't just double-click `index.html`.

If Python is installed:

```bash
python -m http.server 8000
```

Then open:

http://localhost:8000

## Important

Progress is stored in the browser using localStorage. Clearing site data/browser storage will erase progress.

## Make it an installable phone app

The easiest first version is a PWA (Progressive Web App):

1. Put the project online over HTTPS.
2. Open it in Chrome on your phone.
3. Use Chrome's "Install app" / "Add to Home screen" option.
4. It will open like an app.

For a Play Store APK later, wrap this web app with Capacitor or another trusted web-to-app wrapper. Do not put secret API keys in the frontend.
