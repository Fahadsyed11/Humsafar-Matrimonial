# Humsafar Matrimonial

This is a Node.js / Express web application for the Humsafar matrimonial platform.

## Requirements

- Node.js 18 or later
- npm

## Run locally

```bash
npm install
npm start
```

The app listens on `PORT` if provided, otherwise `3000`.

## Deploying to a Node-capable host

This project requires a Node.js runtime because it uses Express and backend API routes (`/api/*`). Static hosting such as GitHub Pages will not support the app correctly.

### Recommended deployment: Render

1. Connect your GitHub repository to Render.
2. Create a new Web Service.
3. Use the `main` branch.
4. Build command: `npm install`
5. Start command: `npm start`
6. Render will automatically set `PORT` and deploy the service.

A `render.yaml` file is included for Render users.

### Alternative deployment: Heroku

A `Procfile` is included for Heroku compatibility.

### GitHub Pages (static demo only)

If you want to serve a static version of the site from GitHub Pages, set Pages source to `main` branch and `/docs` folder.

> This will publish the `docs/` static copy of the app, but backend routes like `/api/*`, sign-up, and login will not work because GitHub Pages cannot run Node.

## Notes

- `server.js` serves the static `public/` folder and backend API routes.
- `humsafar.db` is a local SQLite database file. On hosted platforms, file storage may be ephemeral and can reset after redeploy.
- For full production use, consider replacing SQLite with a managed database service.
