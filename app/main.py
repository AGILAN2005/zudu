import os
import asyncio
from typing import AsyncGenerator,Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel,Field
from dotenv import load_dotenv

from rag import RAGSystem
from embeddings import get_embedding_function
from reranker import get_reranker
from query_expansion import get_query_expander

load_dotenv('.env')

rag_system:Optional[RAGSystem]=None
@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_system
    try:
        rag_system=RAGSystem(
            llm_provider="gemini",
            vector_store_type="faiss",
            embedding_model="bge-large",
            use_reranker=True,
            reranker_model="bge-reranker-large",
            use_query_expansion=True,
            expansion_strategy="multiquery",
            model_name="gemini-2.5-flash"
        )
        vector_store_path=os.getenv("VECTOR_STORE_PATH","./vector_store")
        if os.path.exists(vector_store_path):
            rag_system.load_vector_store(vector_store_path)
        else:
            print("No existing vector store found")
        print("RAG initialized and ready!")
    except Exception as e:
        print("Failed to initalize RAG system: {e}")
        raise
    yield
    print("Shutting down RAG system")

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
        enhanced_prompt = f"""You are an expert assistant with deep analytical capabilities.

Context from documents:
{context}

Question: {question}

Instructions:
1. Analyze the provided context carefully to find relevant information.
2. If the answer is not directly stated, infer from related information and context clues
3. Combine information from multiple sources if the answer is split across documents
4. Be comprehensive but accurate - cite which sources support your answer
5. If you cannot answer based on the context, explicitly state what information is missing

Provide a detailed, well-reasoned answer:"""
        
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

@app.post("/query")
async def query_documents(request: QueryRequest):
    """Query documents with optional streaming"""
    if not rag_system:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    if not rag_system.vector_store:
        raise HTTPException(status_code=400, detail="No documents ingested. Please ingest documents first.")
    
    if request.stream:
        return StreamingResponse(
            generate_stream(request.question, request.k),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    else:
        # Non-streaming response
        result = rag_system.query(request.question, k=request.k)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )