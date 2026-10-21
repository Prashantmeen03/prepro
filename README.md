# AI PrepPro

AI-powered interview preparation and ATS-friendly resume generation, with a React frontend and a backend deployed together on Netlify.

## Run locally

From the repository root:

```sh
npm ci
netlify dev --port 8889
```

Open `http://localhost:8889`. Use Netlify Dev so frontend requests, API routes, and managed authentication run through the same origin. Starting Vite alone serves the interface but does not start the API.

## Deployment

The root `netlify.toml` installs the root npm workspace, runs the frontend build, publishes `Frontend/dist`, and deploys the API in `netlify/functions`. A fallback serves React Router pages on direct links and refreshes. The API owns `/api/*`, which returns JSON or PDF responses.

The frontend defaults to the current site for API requests. `VITE_API_URL` is optional and should be left unset for this deployment. Remove any old localhost or separate-backend override before rebuilding the frontend.

Netlify Identity manages registration, login, email confirmation, session restoration, and logout. New accounts require confirmation when autoconfirm is disabled. Confirmation links are processed when the app loads. Identity must be enabled for the site.

Profiles and interview reports use Netlify Database through Drizzle ORM and `@netlify/database`. The platform supplies the database connection. Schema definitions live in `db/schema.ts`; generated migrations live in `netlify/database/migrations` and are applied by Netlify during deployment. Do not manually apply migrations.

AI generation uses Gemini 2.5 Flash through Netlify AI Gateway with the provider SDK's default configuration. Provider credentials are handled by the platform and are never sent to the browser.

The older Express/MongoDB application in `Backend/` is retained as legacy source; it is not part of the Netlify runtime. Existing MongoDB accounts and records are not automatically imported into Identity or Netlify Database. The Netlify deployment does not require that server, MongoDB, a custom JWT secret, or a local Chrome installation.

## Features

- Managed accounts and private, user-owned profiles and interview reports.
- Interview strategies with compatibility scores, questions, skill gaps, and preparation roadmaps.
- Editable resume profiles with personal details, skills, experience, projects, education, certificates, and achievements.
- PDF and DOCX text extraction for resume profiles; PDF upload or self-description for interview strategies.
- Text-based, searchable resume PDFs generated without a browser binary.
- A backend health check that also checks database access.

Resume uploads are limited to 4 MB to fit serverless request limits. Scanned images without selectable text and legacy `.doc` files are not supported. The upload flow stores extracted text and file metadata; it does not retain the original document. Profile PDF export uses saved data directly. Tailored resume export and strategy generation use AI, with a persistent limit of ten AI generations per account per five minutes.

## API

All routes except health require a valid Identity session. The backend derives record ownership from the authenticated session and never from request body fields.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API and database health; 503 if the database is unavailable |
| GET | `/api/auth/get-me` | Current account in the frontend user format |
| GET | `/api/interview/` | Current user's interview history |
| POST | `/api/interview/` | Generate and save an interview report |
| GET | `/api/interview/report/:id` | Retrieve an owned report |
| POST | `/api/interview/resume/pdf/:id` | Generate a tailored resume PDF from an owned report |
| GET | `/api/resume/profile` | Get or initialize the current user's resume profile |
| PUT | `/api/resume/profile` | Validate and save resume sections |
| POST | `/api/resume/upload` | Extract a PDF or DOCX resume into the profile |
| DELETE | `/api/resume/file` | Remove the uploaded file reference and extracted text |
| GET, POST | `/api/resume/pdf` | Export the saved profile as a PDF |

Sign-up, login, and logout use the `@netlify/identity` SDK rather than the legacy Express authentication endpoints. Mutating API requests must originate from the site.

## Checks

```sh
npm test
npm run typecheck
```

Tests cover protected routes, owner-scoped requests, profile validation, malformed inputs, health failures, upload validation, PDF round trips, and pagination. A production build runs automatically during deployment.
