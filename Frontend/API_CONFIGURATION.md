# API configuration

The frontend reads `VITE_API_URL` as the backend origin and appends the existing `/api/...` routes. Set it in the frontend's environment wherever the site is deployed (for example, in Netlify's environment variables) to the publicly reachable backend origin. Do not include an `/api` suffix.

For local development, leave `VITE_API_URL` unset: Vite proxies `/api` requests to `http://localhost:3000`. Start the backend on port 3000 as described in the root README. If the backend runs elsewhere, update the proxy target in `vite.config.js`.

`Frontend/.env.example` shows the deployment variable format; replace the example with your real backend URL before using it. Never use a successful mocked response to bypass authentication or connection errors.
