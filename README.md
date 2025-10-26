 # Tech Stack

 This project uses the following technologies:

 - Backend
   - Python 3.11
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

 This file contains only the project's technology stack and related infra components.
