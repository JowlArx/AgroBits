# Code Review Summary

## Frontend (`agrobits-app`)
- `DashboardSensores.jsx` renders mock data only; missing integration with Firestore or a fallback/loading state. Consider extracting data fetching into a service and handling errors/loading for production use.
- Cards rely on array index as the React `key`, which can trigger unnecessary rerenders and bugs when list order changes. Use a stable sensor identifier instead.
- Sensor state handling is binary (`ok`/`alerta`), leaving no path for unknown/error states; factoring this into a small helper would improve readability and prevent styling edge cases.
- Minor data quality issues in mock data (e.g., inconsistent spelling of "albahaca") may hide production defects.

## Backend utilities (`firebase-backend`)
- `import.js` requires `./data.json`, but the repository contains `data.json.json`; the script will throw on startup. Align the filenames or use configuration to choose the dataset.
- Credentials (`serviceAccountKey.json`) are committed to source control, which is a security risk. Store secrets outside the repo and load from environment-specific locations.
- Firestore writes are performed sequentially in nested loops. For larger datasets, batching writes (e.g., `Promise.all` with concurrency limits or Firestore batch writes) would improve performance and reduce execution timeouts.
- Error handling is limited to `catch(console.error)`; prefer explicit logging with context (user/sensor IDs) and process exit codes so CI can detect failures.

## Cross-cutting
- Add automated tests or linting to cover data import utilities and basic UI rendering to catch filename mismatches and missing data fields.
- Document how to run the frontend and import scripts, including required environment variables and Firebase setup, to ease onboarding.
