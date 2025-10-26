# Tech Stack

This project uses the following technologies:

- Backend
  - Python 3.10
  - FastAPI (web framework)
  - Uvicorn (ASGI server)
  - LangChain and supporting community packages
  - FAISS (faiss-cpu) for vector search
  - sentence-transformers / FlagEmbedding for embeddings
  - PyPDF2 for PDF processing
  - pydantic / pydantic-settings for configuration and models
  - python-dotenv for environment config

- Frontend
  - React 18
  - TypeScript
  - Vite (dev/build tooling)
  - Chakra UI for UI components
  - react-markdown and remark-gfm for rendering Markdown
  - Axios for HTTP requests

- Infrastructure / Dev tooling
  - Docker and Docker Compose for containerization and orchestration
  - Nginx (used in the frontend container to serve static build)
  - Makefile for convenient local commands

- Notes about data/storage
  - The project stores vector indices and uploaded files in a local `vector_store` directory (FAISS index files on disk).

This README now also includes quick usage instructions below to help you run the project locally or with Docker.

## Usage

Below are quick instructions for running the project locally (development) and running it with Docker / Docker Compose. Commands are shown for PowerShell on Windows; Linux/macOS shells will be similar but activation commands differ for the virtual environment.

### Run locally (backend)

Prerequisites:
- Python 3.10
- Node.js (for frontend) — recommended Node 18+
- git

1. Create and activate a virtual environment (PowerShell):

```powershell
git clone https://github.com/AGILAN2005/zudu.git
cd zudu
python -m venv .venv
# activate the venv
. .\.venv\Scripts\Activate.ps1
```

2. Install Python dependencies:

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

3. Create a `.env` in the repo root or set required environment variables. The project may require credentials for external APIs (for example GEMINI_API_KEY or similar). Add any keys the services expect as environment variables before starting the server.

4. Start the backend API in development mode:

```powershell
# from repo root
python run_server.py
# or equivalently
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server listens on port 8000 by default. You can check the OpenAPI docs at http://localhost:8000/docs and a health check at http://localhost:8000/health

### Run locally (frontend)

1. Install frontend dependencies and run dev server:

```powershell
git clone https://github.com/AGILAN2005/zudu.git
cd frontend
npm ci
npm run dev
```

It typically serves the frontend dev server on http://localhost:3000 (check the console output after `npm run dev`).

2. To build a production frontend bundle:

```powershell
cd frontend
npm run build
```

The production build will be placed in `frontend/dist` and the repository includes an Nginx-based Dockerfile that serves those static files.

### Run with Docker / Docker Compose

The repository includes a `Dockerfile.backend` and `docker-compose.yml` to run the full stack in containers. By default the backend runs on port 8000 inside the container and the frontend static image serves on port 80 (see `frontend/Dockerfile` which exposes 80).

Build and run with Docker (PowerShell):

```powershell
# from repo root
make build
```

This will build images and start containers as configured. Check `docker-compose.yml` for the exact services and port mappings; by default the backend is available on host port 8000.

To run the server:

```powershell
make up
```

To stop and remove containers created by compose:

```powershell
make down
```