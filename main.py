import os
import asyncio
import uuid
import shutil
import json
from typing import AsyncGenerator, Optional, List, Dict,Set
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from rag import RAGSystem
from embeddings import get_embedding_function
from reranker import get_reranker
from query_expansion import get_query_expander

load_dotenv('.env')


rag_system: Optional[RAGSystem] = None

rag_systems: Dict[str, RAGSystem] = {}

initialized_chats: Set[str] = set()

def load_existing_chats():
    """Load all existing chat sessions from disk on startup"""
    global rag_systems, chat_histories, initialized_chats
    
    vector_store_base = Path(os.getenv('VECTOR_STORE_PATH', './vector_store'))
    if not vector_store_base.exists():
        return
    
    for chat_dir in vector_store_base.iterdir():
        if not chat_dir.is_dir():
            continue
            
        chat_id = chat_dir.name
        if chat_id in initialized_chats:
            continue
            
        try:
            # Load RAG system for this chat
            chat_rag = RAGSystem(
                llm_provider="gemini",
                vector_store_type="faiss",
                embedding_model="bge-large",
                use_reranker=True,
                reranker_model="bge-reranker-large",
                use_query_expansion=True,
                expansion_strategy="multiquery",
                model_name="gemini-2.5-flash"
            )
            
            # Load existing vector store
            if (chat_dir / "index.faiss").exists():
                chat_rag.load_vector_store(str(chat_dir))
                rag_systems[chat_id] = chat_rag
                initialized_chats.add(chat_id)
                
                # Load chat history if exists
                history_file = chat_dir / "history.json"
                if history_file.exists():
                    with open(history_file, 'r') as f:
                        chat_histories[chat_id] = json.load(f)
                else:
                    chat_histories[chat_id] = []
                    
                print(f"✅ Loaded chat: {chat_id}")
        except Exception as e:
            print(f"⚠️ Failed to load chat {chat_id}: {e}")

def save_chat_history(chat_id: str):
    """Persist chat history to disk"""
    if chat_id not in chat_histories:
        return
        
    vector_store_base = Path(os.getenv('VECTOR_STORE_PATH', './vector_store'))
    chat_dir = vector_store_base / chat_id
    chat_dir.mkdir(parents=True, exist_ok=True)
    
    history_file = chat_dir / "history.json"
    with open(history_file, 'w') as f:
        json.dump(chat_histories[chat_id], f)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_system
    try:
        # Initialize default RAG system
        rag_system = RAGSystem(
            llm_provider="gemini",
            vector_store_type="faiss",
            embedding_model="bge-large",
            use_reranker=True,
            reranker_model="bge-reranker-large",
            use_query_expansion=True,
            expansion_strategy="multiquery",
            model_name="gemini-2.5-flash"
        )
        
        vector_store_path = os.getenv("VECTOR_STORE_PATH", "./vector_store")
        if os.path.exists(vector_store_path) and os.path.isfile(os.path.join(vector_store_path, "index.faiss")):
            rag_system.load_vector_store(vector_store_path)
        else:
            print("No existing default vector store found")
        
        # Load all existing chat sessions
        print("🔄 Loading existing chat sessions...")
        load_existing_chats()
        print(f"✅ RAG initialized! Loaded {len(rag_systems)} chat sessions")
        
    except Exception as e:
        print(f"Failed to initialize RAG system: {e}")
        raise
    
    yield
    
    # Save all chat histories on shutdown
    print("💾 Saving chat histories...")
    for chat_id in chat_histories.keys():
        save_chat_history(chat_id)
    print("Shutting down RAG system")

chat_histories: Dict[str, List[dict]] = {}

app = FastAPI(
    title="RAG Streaming API",
    description="Multi-document RAG system with streaming responses",
    version="1.0.0",
    lifespan=lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question")
    k: int = Field(default=10, ge=1, le=50, description="Number of documents to retrieve")
    stream: bool = Field(default=True, description="Enable streaming response")
    chat_id: Optional[str] = Field(default=None, description="Chat id to scope the query to uploaded documents")
class IngestRequest(BaseModel):
    pdf_paths: list[str] = Field(..., description="List of PDF file paths to ingest")

class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    vector_store_loaded: bool

# Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": rag_system is not None,
        "vector_store_loaded": rag_system.vector_store is not None if rag_system else False
    }

@app.post("/ingest")
async def ingest_documents(request: IngestRequest):
    """Ingest PDF documents into the RAG system"""
    if not rag_system:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        num_chunks = rag_system.ingest_documents(request.pdf_paths)
        
        # Save vector store
        vector_store_path = os.getenv("VECTOR_STORE_PATH", "./vector_store")
        rag_system.save_vector_store(vector_store_path)
        
        return {
            "status": "success",
            "num_chunks": num_chunks,
            "num_documents": len(request.pdf_paths)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

async def generate_stream(question: str, k: int) -> AsyncGenerator[str, None]:
    """Generate streaming response"""
    try:
        # Step 1: Retrieve documents
        yield "data: {\"type\": \"status\", \"content\": \"🔍 Retrieving documents...\"}\n\n"
        await asyncio.sleep(0.1)
        
        retrieved_docs = rag_system._retrieve_with_expansion(question, k=k)
        yield f"data: {{\"type\": \"status\", \"content\": \"📚 Retrieved {len(retrieved_docs)} documents\"}}\n\n"
        await asyncio.sleep(0.1)
        
        # Step 2: Rerank if enabled
        if rag_system.use_reranker and len(retrieved_docs) > 0:
            yield "data: {\"type\": \"status\", \"content\": \"🎯 Reranking documents...\"}\n\n"
            await asyncio.sleep(0.1)
            
            context_docs = rag_system.reranker.rerank_documents(question, retrieved_docs)
            yield f"data: {{\"type\": \"status\", \"content\": \"✅ Top {len(context_docs)} documents selected\"}}\n\n"
        else:
            context_docs = retrieved_docs[:5]
        
        # Step 3: Generate context
        yield "data: {\"type\": \"status\", \"content\": \"💭 Generating answer...\"}\n\n"
        await asyncio.sleep(0.1)
        
        context = "\n\n".join([
            f"[Source: {doc.metadata.get('source', 'Unknown')}]\n{doc.page_content}"
            for doc in context_docs
        ])
        
        # Enhanced prompt
#         enhanced_prompt = f"""You are an expert assistant with deep analytical capabilities.

# Context from documents:
# {context}

# Question: {question}

# Instructions:
# 1. Analyze the provided context carefully to find relevant information.
# 2. If the answer is not directly stated, infer from related information and context clues
# 3. Combine information from multiple sources if the answer is split across documents
# 4. Be comprehensive but accurate - cite which sources support your answer
# 5. If you cannot answer based on the context, explicitly state what information is missing

# Provide a detailed, well-reasoned answer:"""
        # PATCH: Replace the enhanced_prompt block in generate_stream (around line 204)
        
        # Enhanced prompt
        enhanced_prompt = f"""You are an expert assistant with deep analytical capabilities.

Context from documents:
{context}

Question: {question}

**Your Task:**
Provide a detailed, well-reasoned answer to the **Question** using *only* the **Context from documents**.

**Instructions:**
[Basic note: if the user greets or appreciates you should respond gentle and give them a pretty good response in 1 sentence and ask how may i help you with this document uploaded]

1.  **"Not Found" Rule:** If you cannot answer the question based *only* on the provided context, you MUST respond with the exact phrase:
    "I couldn’t find this information in the provided documents."
    Do not add any other text.

2.  **Analysis:** If the answer is in the context, analyze it carefully. Infer from related clues and combine information from multiple sources if needed.

3.  **Citation:** You MUST cite *every* piece of information you use. Place the citation (e.g., [source_filename.pdf]) directly after the fact or sentence it supports.

4.  **Formatting (Very Important):**
    * Structure your answer using **Markdown**.
    * Use **bullet points** (`*`) for lists or key features.
    * Use **numbered lists** (`1.`) for steps or sequences.
    * Use **tables** if the question asks for comparisons or structured data.
    * Use **bold text** (`**bold**`) for emphasis.
    * Use new paragraphs (a blank line) for separation.

**Answer:**"""
        
        
        # Step 4: Stream LLM response
        response = await asyncio.to_thread(rag_system.llm.invoke, enhanced_prompt)
        answer_text = response.content

        # Stream answer word by word
        words = answer_text.split()
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"data: {{\"type\": \"content\", \"content\": \"{chunk}\"}}\n\n"
            await asyncio.sleep(0.03)  # Simulate streaming delay
        
        # Step 5: Send sources
        sources = []
        for idx, doc in enumerate(context_docs, 1):
            sources.append({
                "id": idx,
                "source": doc.metadata.get('source', 'Unknown'),
                "parent_chunk": doc.metadata.get('parent_chunk_id', 'N/A')
            })
        
        import json
        yield f"data: {{\"type\": \"sources\", \"content\": {json.dumps(sources)}}}\n\n"
        
        # Done
        yield "data: {\"type\": \"done\"}\n\n"
        
    except Exception as e:
        yield f"data: {{\"type\": \"error\", \"content\": \"Error: {str(e)}\"}}\n\n"

# PATCH: Replace lines 280-329 with this:
async def generate_stream_for_chat(question: str, k: int, chat_id: Optional[str]) -> AsyncGenerator[str, None]:
    """Wrapper that selects the appropriate RAG system by chat_id and records history."""
    global rag_system, rag_systems, chat_histories

    # Select RAG system - try to load if not in memory
    if chat_id:
        if chat_id not in rag_systems:
            # Try to load from disk
            vector_store_base = Path(os.getenv('VECTOR_STORE_PATH', './vector_store'))
            chat_dir = vector_store_base / chat_id
            if chat_dir.exists() and (chat_dir / "index.faiss").exists():
                try:
                    chat_rag = RAGSystem(
                        llm_provider="gemini",
                        vector_store_type="faiss",
                        embedding_model="bge-large",
                        use_reranker=True,
                        reranker_model="bge-reranker-large",
                        use_query_expansion=True,
                        expansion_strategy="multiquery",
                        model_name="gemini-2.5-flash"
                    )
                    chat_rag.load_vector_store(str(chat_dir))
                    rag_systems[chat_id] = chat_rag
                    initialized_chats.add(chat_id)
                    
                    # Load history
                    history_file = chat_dir / "history.json"
                    if history_file.exists():
                        with open(history_file, 'r') as f:
                            chat_histories[chat_id] = json.load(f)
                    else:
                        chat_histories[chat_id] = []
                except Exception as e:
                    yield f"data: {{\"type\": \"error\", \"content\": \"Error loading chat: {str(e)}\"}}\n\n"
                    return
            else:
                yield f"data: {{\"type\": \"error\", \"content\": \"Chat {chat_id} not found\"}}\n\n"
                return
        
        rag = rag_systems[chat_id]
    else:
        rag = rag_system # Default RAG

    if not rag:
         yield f"data: {{\"type\": \"error\", \"content\": \"RAG system not available\"}}\n\n"
         return

    # Record user message in history
    if chat_id:
        chat_histories.setdefault(chat_id, []).append({"role": "user", "content": question})
        save_chat_history(chat_id)  # Persist immediately

    try:
        # Temporarily set the global rag_system expected by generate_stream
        old_rag = globals().get('rag_system')
        globals()['rag_system'] = rag
        
        full_answer = ""
        source_docs = []
        
        async for chunk in generate_stream(question, k):
            yield chunk
            # Capture the full answer and sources for history
            try:
                if chunk.startswith('data: '):
                    data_str = chunk[6:]
                    parsed = json.loads(data_str)
                    if parsed.get('type') == 'content':
                        # De-escape JSON special characters
                        content_chunk = parsed.get('content', '')
                        full_answer += content_chunk
                    elif parsed.get('type') == 'sources':
                        source_docs = parsed.get('content', [])
            except json.JSONDecodeError:
                pass # Ignore non-json lines

        # Restore global rag_system
        globals()['rag_system'] = old_rag
        
        # Save assistant message to history
        if chat_id:
            assistant_entry = {
                "role": "assistant",
                "content": full_answer.strip(),
                "sources": source_docs 
            }
            chat_histories.setdefault(chat_id, []).append(assistant_entry)
            save_chat_history(chat_id)  # Persist after response

    except Exception as e:
        yield f"data: {{\"type\": \"error\", \"content\": \"Error: {str(e)}\"}}\n\n"
        # Restore global rag_system on error
        if 'old_rag' in locals():
            globals()['rag_system'] = old_rag
@app.post("/query")
async def query_documents(request: QueryRequest):
    """Query documents with optional streaming"""
    
    # Select rag system based on chat_id if provided
    selected_rag = rag_system # Default
    if request.chat_id:
        selected_rag = rag_systems.get(request.chat_id)
        if not selected_rag:
             # Try to load it if not in memory
            try:
                load_existing_chats() # This will load it if it exists on disk
                selected_rag = rag_systems.get(request.chat_id)
                if not selected_rag:
                    raise HTTPException(status_code=404, detail=f"Chat id {request.chat_id} not found")
            except Exception as e:
                raise HTTPException(status_code=404, detail=f"Chat id {request.chat_id} not found: {e}")

    if not selected_rag.vector_store:
        raise HTTPException(status_code=400, detail="No documents ingested for this chat. Please upload documents first.")

    if request.stream:
        return StreamingResponse(
            generate_stream_for_chat(request.question, request.k, request.chat_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    else:
        # Non-streaming response
        result = selected_rag.query(request.question, k=request.k)
        
        # Record to history if chat_id provided
        if request.chat_id:
            chat_histories.setdefault(request.chat_id, []).append({"role": "user", "content": request.question})
            assistant_entry = {
                "role": "assistant",
                "content": result['answer'],
                "sources": [
                    {"source": doc.metadata.get('source', 'Unknown'), "parent_chunk": doc.metadata.get('parent_chunk_id', 'N/A')}
                    for doc in result['source_documents']
                ]
            }
            chat_histories.setdefault(request.chat_id, []).append(assistant_entry)
            save_chat_history(request.chat_id)

        return {
            "answer": result['answer'],
            "sources": [
                {
                    "source": doc.metadata.get('source', 'Unknown'),
                    "parent_chunk": doc.metadata.get('parent_chunk_id', 'N/A')
                }
                for doc in result['source_documents']
            ],
            "num_sources": result['num_sources']
        }

@app.post('/upload')
async def upload_and_create_chat(files: List[UploadFile] = File(...)):
    """Upload multiple PDF files, create a new chat id, ingest documents and persist vector store under that chat id."""
    global rag_systems, chat_histories, initialized_chats

    if not files:
        raise HTTPException(status_code=400, detail='No files uploaded')

    chat_id = str(uuid.uuid4())
    base_dir = Path(os.getenv('VECTOR_STORE_PATH', './vector_store')) / chat_id
    upload_dir = base_dir / 'uploads'
    os.makedirs(upload_dir, exist_ok=True)

    saved_paths = []
    try:
        for upload in files:
            filename = Path(upload.filename).name
            dest = upload_dir / filename
            with open(dest, 'wb') as f:
                shutil.copyfileobj(upload.file, f)
            saved_paths.append(str(dest))

        # Create a per-chat RAG system instance
        chat_rag = RAGSystem(
            llm_provider="gemini",
            vector_store_type="faiss",
            embedding_model="bge-large",
            use_reranker=True,
            reranker_model="bge-reranker-large",
            use_query_expansion=True,
            expansion_strategy="multiquery",
            model_name="gemini-2.5-flash"
        )

        num_chunks = chat_rag.ingest_documents(saved_paths)
        chat_rag.save_vector_store(str(base_dir))

        # Register and persist
        rag_systems[chat_id] = chat_rag
        initialized_chats.add(chat_id)
        chat_histories[chat_id] = [] # Create empty history
        save_chat_history(chat_id) # Save the empty history.json

        return {
            "status": "success",
            "chat_id": chat_id,
            "num_chunks": num_chunks,
            "num_documents": len(saved_paths),
            "files": [Path(p).name for p in saved_paths]
        }
    except Exception as e:
        # Cleanup on failure
        if base_dir.exists():
            shutil.rmtree(base_dir)
        raise HTTPException(status_code=500, detail=f"Upload/ingest failed: {str(e)}")
@app.get('/chats')
async def list_chats():
    """
    Return list of all chat ids with metadata.
    Reads from the filesystem to ensure all chats are listed.
    """
    chats_info = []
    vector_store_base = Path(os.getenv('VECTOR_STORE_PATH', './vector_store'))
    
    if not vector_store_base.exists():
        return []

    for chat_dir in vector_store_base.iterdir():
        if not chat_dir.is_dir():
            continue
        
        chat_id = chat_dir.name
        title = f"Chat {chat_id[:8]}..."  # Default title
        num_messages = 0
        files = []

        # Try to get files
        upload_dir = chat_dir / 'uploads'
        if upload_dir.exists():
            files = [f.name for f in upload_dir.glob('*.pdf')]

        # Try to get history and title
        history_file = chat_dir / "history.json"
        history = []
        if history_file.exists():
            try:
                with open(history_file, 'r') as f:
                    history = json.load(f)
                    num_messages = len(history)
                    # Find first user message for title
                    for msg in history:
                        if msg.get('role') == 'user':
                            content = msg.get('content', 'Untitled')
                            title = content[:40]  # Get first 40 chars
                            if len(content) > 40:
                                title += "..."
                            break
            except Exception as e:
                print(f"Could not parse history for {chat_id}: {e}")
        
        chats_info.append({
            "chat_id": chat_id,
            "title": title,  # New field
            "num_messages": num_messages,
            "files": files,
            "created": chat_dir.stat().st_ctime,
        })
    
    # Sort by creation time (newest first)
    chats_info.sort(key=lambda x: x['created'] or 0, reverse=True)
    return chats_info

@app.get('/chats/{chat_id}/history')
async def get_chat_history(chat_id: str):
    history = chat_histories.get(chat_id)
    if history is None:
        raise HTTPException(status_code=404, detail='Chat not found')
    return {"chat_id": chat_id, "history": history}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
@app.delete('/chats/{chat_id}')
async def delete_chat(chat_id: str):
    """Delete a chat session and all its data."""
    global rag_systems, chat_histories, initialized_chats

    base_dir = Path(os.getenv('VECTOR_STORE_PATH', './vector_store')) / chat_id

    if not base_dir.exists() or not base_dir.is_dir():
        raise HTTPException(status_code=404, detail='Chat not found')

    try:
        # Remove from in-memory dicts
        rag_systems.pop(chat_id, None)
        chat_histories.pop(chat_id, None)
        if chat_id in initialized_chats:
            initialized_chats.remove(chat_id)
        
        # Delete from disk
        shutil.rmtree(base_dir)
        
        return {"status": "success", "chat_id": chat_id, "detail": "Chat deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete chat: {str(e)}")