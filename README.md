# 🚀 AI Interview Prep & Resume Generator

An end-to-end, AI-powered interview preparation platform and ATS-tailored resume generator. Built with **React 19**, **Node.js & Express 5**, **MongoDB**, and **Google Gemini GenAI**.

The platform analyzes a candidate's resume (PDF) and self-description against a target job description to generate custom interview strategies, mock questions with model answers, day-by-day roadmaps, skill gap assessments, and ATS-optimized downloadable PDF resumes.

---

## ✨ Features

- **📄 Resume PDF Text Extraction**: Automatically parses uploaded `.pdf` resumes on the server using `pdf-parse`.
- **🤖 Gemini AI Strategy Engine**:
  - **Match Score**: Calculates candidate-job compatibility score (0–100%).
  - **Technical Interview Questions**: Curated technical questions with interviewer intention and comprehensive model answers.
  - **Behavioral Questions**: Tailored behavioral questions designed to demonstrate cultural fit and leadership.
  - **Day-by-Day Preparation Roadmap**: Step-by-step daily study plans with actionable tasks.
  - **Skill Gap Analysis**: Identifies missing competencies ranked by severity (`high`, `medium`, `low`).
- **📥 ATS-Friendly Resume PDF Generator**: Generates an ATS-compliant, tailored HTML resume via Gemini and compiles it to a downloadable PDF via **Puppeteer**.
- **🔐 Secure Authentication**:
  - User registration and login using **bcryptjs** password hashing and **JWT** stored in HTTP-only cookies.
  - Secure logout with database-backed token blacklisting.
- **🎨 Modern Dark UI**: Sleek dark-mode interface designed with **SCSS** and **React 19**.

---

## 🛠️ Tech Stack

### **Frontend**
- **Library**: React 19
- **Bundler**: Vite 7
- **Routing**: React Router 7
- **Styling**: SCSS (Dart Sass with `@use "sass:color"`)
- **HTTP Client**: Axios (with credential support)

### **Backend**
- **Runtime**: Node.js (v18+)
- **Framework**: Express 5
- **Database**: MongoDB (Mongoose 9 ODM)
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **File Uploads**: Multer (in-memory buffer)
- **PDF Extraction**: `pdf-parse`
- **PDF Compilation**: Puppeteer
- **AI / LLM**: `@google/genai` (Gemini Flash) with Zod structured output schema validation

---

## 📂 Project Structure

```text
YT1-P/
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # MongoDB connection handler
│   │   ├── controllers/
│   │   │   ├── auth.controller.js   # User registration, login, logout, getMe
│   │   │   └── interview.controller.js # AI report & PDF resume controllers
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js   # JWT authentication & blacklist verification
│   │   │   └── file.middleware.js   # Multer resume file upload handler
│   │   ├── models/
│   │   │   ├── user.model.js        # User schema
│   │   │   ├── blacklist.model.js   # Token blacklist schema with TTL
│   │   │   └── interviewReport.model.js # Stored interview reports schema
│   │   ├── routes/
│   │   │   ├── auth.routes.js       # /api/auth routes
│   │   │   └── interview.routes.js  # /api/interview routes
│   │   ├── services/
│   │   │   └── ai.service.js        # Gemini AI generation & Puppeteer PDF rendering
│   │   └── app.js                   # Express application setup, CORS, routes
│   ├── .env                         # Environment variables (secret)
│   ├── .env.example                 # Example environment variables template
│   ├── package.json
│   └── server.js                    # Server entry point
│
├── Frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/                # Auth context, hooks, pages (Login, Register)
│   │   │   └── interview/           # Interview context, hooks, pages (Home, Interview)
│   │   ├── style/                   # Reusable SCSS stylesheets
│   │   ├── App.jsx                  # App root with context providers
│   │   ├── app.routes.jsx           # React Router route definitions
│   │   ├── main.jsx                 # Vite React entry point
│   │   └── style.scss               # Global stylesheet
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (or a local MongoDB instance)
- [Google AI Studio](https://aistudio.google.com/) Gemini API Key

---

### 1. Backend Setup

1. Open a terminal and navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your environment variables by creating or editing `.env`:
   ```bash
   cp .env.example .env
   ```

   Fill in the required keys in `Backend/.env`:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   GOOGLE_GENAI_API_KEY=your_gemini_api_key
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will run at [http://localhost:3000](http://localhost:3000).*

---

### 2. Frontend Setup

1. Open a separate terminal and navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will run at [http://localhost:5173](http://localhost:5173).*

---

## 🔑 Environment Variables Reference

### Netlify frontend deployment

The root `netlify.toml` configures Netlify to install dependencies and run the
Vite build in `Frontend/`, then publish `Frontend/dist`. It also serves
`index.html` for application routes so opening or refreshing `/login`,
`/register`, and dashboard links works with React Router.

Set `VITE_API_URL` in Netlify to the HTTPS origin of the deployed Express API
before deploying. Vite includes this setting at build time. Without it, the
frontend defaults to `http://localhost:3000` for local development; that address
cannot reach your server from a visitor's browser. The backend must also allow
the frontend's HTTPS origin in its credentialed CORS configuration and use
cookies appropriate for the deployment's domains.

This configuration deploys the frontend only. `Backend/server.js` is a separate
Express server and is not started by the static frontend deployment.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Port number for Express server | `3000` |
| `MONGO_URI` | MongoDB Atlas or local connection URI | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/yt-genai` |
| `JWT_SECRET` | Secret key used to sign and verify JWTs | `super_secret_jwt_key_123` |
| `GOOGLE_GENAI_API_KEY` | Google Gemini API key from Google AI Studio | `AIzaSy...` |

---

## 📡 API Endpoints

### **Authentication (`/api/auth`)**
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Login user & set auth cookie | ❌ |
| `GET` | `/api/auth/logout` | Logout user & blacklist token | ❌ |
| `GET` | `/api/auth/get-me` | Get current logged-in user profile | ✅ |

### **Interview & Resume (`/api/interview`)**
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/interview/` | Generate new interview report (multipart: `resume` file, `jobDescription`, `selfDescription`) | ✅ |
| `GET` | `/api/interview/` | Get all interview reports for the authenticated user | ✅ |
| `GET` | `/api/interview/report/:interviewId` | Fetch full report by ID | ✅ |
| `POST` | `/api/interview/resume/pdf/:interviewReportId` | Generate & download tailored ATS PDF resume | ✅ |

---

## 💡 How to Use

1. **Register / Login**:
   - Navigate to [http://localhost:5173/register](http://localhost:5173/register) and create an account.
2. **Create an Interview Strategy**:
   - On the Home page, paste the target Job Description.
   - Upload your existing resume (PDF) or write a self-description.
   - Click **"Generate My Interview Strategy"**.
3. **Study & Prepare**:
   - Access technical and behavioral interview questions with suggested answers.
   - Follow the personalized preparation roadmap.
   - Check your compatibility score and identify priority skill gaps.
4. **Download Resume**:
   - Click **"Download Resume"** in the interview view to download an ATS-tailored PDF resume.

---

## 📄 License
This project is licensed under the [ISC License](LICENSE).
