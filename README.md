# IssuePilot ✈️

IssuePilot is a full-stack, AI-powered GitHub Issue Triage platform built as a capstone project for the **Google × Kaggle AI Agents** program. It helps open-source maintainers prioritize issues, detect duplicate submissions, identify missing diagnostic details, and recommend relevant tags for human review.

---

## 🚀 Features

- **AI-Powered Priority Queue**: Dynamically assesses issue severity to assign priority tags (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Smart Duplicate Detection**: Semantic issue search across active repository issues to detect duplicate bug reports or feature requests.
- **Completeness Auditing**: Inspects issue bodies to highlight missing elements (e.g., reproduction steps, logs, platform versions) and flags what developers need.
- **Label Predictor**: Recommends standard GitHub-style tags (e.g., `bug`, `feature request`, `documentation`).
- **Comprehensive Reasoning**: Generates cohesive triage rationales explaining the AI's categorization for maintainers.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router, TypeScript, Tailwind CSS)
- **Backend**: FastAPI (Python 3.11+, SQLModel ORM, Async Client)
- **Database**: PostgreSQL (Data persistence)
- **Caching & Memory**: Redis (API response caching, session management)
- **AI Agent Framework**: Google Agent Development Kit (ADK 2.0 Workflows API)
- **Models**: Gemini API (`gemini-1.5-flash` via AI Studio or Vertex AI)
- **Integrations**: GitHub REST API (Issue sync & webhook receivers)
- **Environment**: Docker & Docker Compose (Containerization)

---

## 📐 Architecture & Workflow

IssuePilot offloads intensive processing to a parallelized, graph-based DAG orchestrator built with Google ADK 2.0:

```
                  ┌───────────────────────┐
                  │      START Node       │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ Initialize State Node │
                  └───────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │  Duplicate   │  │ Missing Info │  │ Label/Priority│
     │  Detector    │  │   Checker    │  │  Predictor   │
     └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │   JoinNode Merging    │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ Format Triage Summary │
                  └───────────────────────┘
```

---

## 📦 Setup & Installation

Follow these steps to run the IssuePilot platform on your machine.

### Prerequisites
- [Git](https://git-scm.com/)
- [Docker & Docker Compose](https://www.docker.com/)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/jayeshsutar92/IssuePilot.git
cd IssuePilot
```

---

### Step 2: Configure Environment Variables (Add Your API Keys)
Create a `.env` file in the root directory:

```bash
touch .env
```

Open `.env` and add your credentials:
```env
# GitHub Personal Access Token (PAT)
# Retrieve from: GitHub -> Settings -> Developer Settings -> Personal Access Tokens (classic)
# Requires 'repo' scope permissions.
GITHUB_PAT=your_github_personal_access_token_here

# Gemini API Key (AI Studio)
# Retrieve from: https://aistudio.google.com/
# Alternatively, if running on Google Cloud, ADK will automatically use Application Default Credentials (ADC).
GEMINI_API_KEY=your_gemini_api_key_here
```

> [!WARNING]
> **Keep your keys secure!** The `.env` file is excluded from Git tracking via `.gitignore` and `.ignore`. Never commit your real API keys to a public repository.

---

### Step 3: Run the Application (Docker Compose)
Build and run the entire stack with a single command:

```bash
docker compose up --build
```

This starts four services:
1. **Frontend**: Next.js dashboard at `http://localhost:3000`
2. **Backend**: FastAPI server at `http://localhost:8000`
3. **Database**: PostgreSQL on port `5432`
4. **Cache**: Redis on port `6379`

Once running, navigate to `http://localhost:3000` in your web browser.

---

## 🧪 Local Development (Manual Setup)

If you wish to run the backend and frontend services locally outside of Docker containers:

### 1. Database & Cache Services
Spin up only the database and Redis services:
```bash
docker compose up -d db redis
```

### 2. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install Python dependencies using `uv` (Astral's fast packaging tool):
   ```bash
   uv sync --all-extras
   ```
3. Activate the virtual environment:
   - **Windows PowerShell**: `.venv\Scripts\Activate.ps1`
   - **Linux/macOS**: `source .venv/bin/activate`
4. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

### 3. Frontend Setup
1. In a new terminal window, navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` to access the application.

---

## 📊 Evaluation & Testing

The triage agent is evaluated locally using the Google ADK Evaluation harness:

1. Navigate to the `backend` folder and activate the virtual environment.
2. Run the evaluation dataset to check triage classification accuracy:
   ```bash
   agents-cli eval run --dataset tests/eval/datasets/issues_eval.json
   ```
The evaluation report will be compiled under `backend/artifacts/grade_results/` showing performance scores.

---

## 📄 License
This project is licensed under the Apache-2.0 License. See the LICENSE details.
