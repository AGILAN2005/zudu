import os
from typing import List,Dict,Any,Optional
from pathlib import Path
import warnings
warnings.filterwarnings("ignore", category=UserWarning)
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.schema import Document
from langchain_community.vectorstores import FAISS, Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from embeddings import get_embedding_function
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from reranker import get_reranker
from query_expansion import get_query_expander
load_dotenv('.env')

class HeirarchicalChunker:
    """Implements hierarchical chunking for documents.""" 
    def __init__(
            self,
            parent_chunk_size: int = 2000,
            parent_overlap: int = 400,
            child_chunk_size: int = 500,
            child_overlap: int = 50,
    ):
        """
        Initialize hierarchical chunker
        Args:
            parent_chunk_size: Size of parent chunks.
            parent_overlap: Overlap between parent chunks.
            child_chunk_size: Size of child chunks.
            child_overlap: Overlap between child chunks.
        """
        self.parent_splitter = RecursiveCharacterTextSplitter(
            chunk_size=parent_chunk_size,
            chunk_overlap=parent_overlap,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""],
        )
        self.child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=child_chunk_size,
            chunk_overlap=child_overlap,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""],
        )
    def create_hierarchical_chunks(self,text:str,metadata:Dict) -> List[Document]:
        """
        Create hierarchical chunks from text.
        
        Args:
            text: Input text to chunk.
            metadata: Metadata to associate with chunks.
        
        Returns:
            List of Document objects with hierarchical metadata.
        """
        parent_docs=self.parent_splitter.create_documents([text],metadatas=[metadata])
        hierarchical_docs=[]

        for parent_idx,parent_docs in enumerate(parent_docs):
            child_docs=self.child_splitter.create_documents(
                [parent_docs.page_content],
                metadatas=[{**parent_docs.metadata,"parent_chunk_index":parent_idx}]
            )

            for child_idx,child_doc in enumerate(child_docs):
                child_metadata={
                    **metadata,
                    "parent_chunk_id":parent_idx,
                    "child_chunk_id":child_idx,
                    "parent_content":parent_docs.page_content[:300],
                    "hierarchy_level":"child"
                }
                hierarchical_docs.append(
                    Document(
                        page_content=child_doc.page_content,
                        metadata=child_metadata
                        )
                )
        return hierarchical_docs
class PDFProcessor:
    """Handles PDF document processing."""
    @staticmethod
    def extract_text_from_pdf(pdf_path: str) -> tuple[str,Dict]:
        """
        Extract text from PDF file.
        
        Args:
            pdf_path: Path to the PDF file.
        
        Returns:
            Tuple of (extracted_text,metadata)
        """
        try:
            reader = PdfReader(pdf_path)
            text=""
            for page_num,page in enumerate(reader.pages):
                page_text=page.extract_text()
                if page_text:
                    text+=f"\n--- Page {page_num + 1} ---\n{page_text}"
            metadata={
                'source':os.path.basename(pdf_path),
                'total_pages':len(reader.pages),
                'file_path':pdf_path,
            }
            return text,metadata
        except Exception as e:
            raise Exception(f"Error processing PDF {pdf_path}: {e}")
    @staticmethod
    def process_multiple_pdfs(pdf_paths:List[str])->List[tuple[str,Dict]]:
        """
        Process multiple PDF files.
        
        Args:
            pdf_paths: List of PDF file paths.
        
        Returns:
            List of tuples (text,metadata) tuples.
        """
        results=[]

        for pdf_path in pdf_paths:
            try:
                text,metadata=PDFProcessor.extract_text_from_pdf(pdf_path)
                results.append((text,metadata))
                print(f"Processed PDF: {os.path.basename(pdf_path)}")
            except Exception as e:
                print(f"Failed:{os.path.basename(pdf_path)}-{str(e)}")
        return results
class VectorStoreManager:
    """Manages vector store operations for FAISS and ChromaDB"""
    def __init__(self,embedding_function):
        """
        Initialize Vector store manager
        Args:
            embedding_function: Embedding function to use.
        """
        self.embedding_function=embedding_function
        self.vector_stores={}
    def create_faiss_store(
            self,
            documents:List[Document],
            store_name:str="faiss_index",
    )-> FAISS:
        """
        Create FAISS vector store
        Args:
            documents: List of documents to index
            store_name: Name of the FAISS index.
        Returns:
            FAISS vector store.
        """
        vector_store=FAISS.from_documents(
            documents=documents,
            embedding=self.embedding_function,
        )
        self.vector_stores[store_name]=vector_store
        print(f"FAISS store '{store_name}' created with {len(documents)} documents.")
        return vector_store
    def create_chroma_store(
            self,
            documents:List[Document],
            persist_directory:str="chroma_db",
            collection_name:str="rag_collection",
    ) -> Chroma:
        """
        Create ChromaDB vector store
        Args:
            documents: List of documents to index
            persist_directory: Directory to persist ChromaDB.
            collection_name: Name of the ChromaDB collection.
        Returns:
            Chroma vector store.
        """
        vector_store=Chroma.from_documents(
            documents=documents,
            embedding=self.embedding_function,
            persist_directory=persist_directory,
            collection_name=collection_name,
        )
        vector_store.persist()
        self.vector_store[collection_name]=vector_store
        print(f"ChromaDB store '{collection_name}' created with {len(documents)} documents.")
        return vector_store
    def save_faiss_store(self,store_name:str,path:str):
        """
        Save FAISS vector store to disk."""
        if store_name in self.vector_stores:
            self.vector_stores[store_name].save_local(path)
            print(f"FAISS store '{store_name}' saved to {path}.")
        else:
            print(f"Error: No FAISS store found with name '{store_name}' to save.")
            
    def load_faiss_store(self,store_name:str,path:str)->FAISS:
        """
        Load FAISS vector store from disk.
        """
        vector_store=FAISS.load_local(
            path,
            self.embedding_function,
            allow_dangerous_deserialization=True
        )
        self.vector_stores[store_name]=vector_store
        print(f"FAISS store '{store_name}' loaded from {path}.")
        return vector_store

class RAGSystem:
    """ RAG system with multiple document support"""
    def __init__(
            self,
            llm_provider:str="gemini",
            vector_store_type:str="faiss",
            embedding_model:str="bge-large",
            use_reranker:bool=True,
            reranker_model:str="bge-reranker-large",
            use_query_expansion:bool=True,
            expansion_strategy:str="multiquery",
            model_name:Optional[str]=None,
            
        ):
        """
        Initialize RAG system.
        Args:
            llm_provider: LLM provider to use ("gemini" or "openai").
            vector_store_type: Type of vector store ("faiss" or "chroma").
            embedding_model: 'bge-large', 'e5-large', 'minilm', etc.
            use_reranker: Enable reranking for better relevance
            reranker_model: Reranker model to use
            use_query_expansion: Enable query expansion
            expansion_strategy: 'multiquery', 'hyde', or 'subquestions'
            model_name: Optional model name for embeddings.
        """
        self.llm_provider=llm_provider
        self.vector_store_type=vector_store_type
        self.use_reranker = use_reranker  # PATCH update
        self.use_query_expansion = use_query_expansion  # PATCH update
        self.expansion_strategy = expansion_strategy  # PATCH update

        # PATCH update: Initialize with advanced embedding model
        print(f"🔧 Initializing embedding model: {embedding_model}")
        self.embedding_function = get_embedding_function(
            model_name=embedding_model,
            device='cpu'
        )
        # self.embedding_function=get_embedding_function()

        self.chunker=HeirarchicalChunker()
        self.pdf_processor=PDFProcessor()
        self.vector_store_manager=VectorStoreManager(self.embedding_function)

        # PATCH update: Initialize reranker if enabled
        if self.use_reranker:
            print(f"🔧 Initializing reranker: {reranker_model}")
            self.reranker = get_reranker(
                model_name=reranker_model,
                top_n=5
            )
        # PATCH update: Initialize query expander if enabled
        if self.use_query_expansion:
            print(f"🔧 Initializing query expander: {expansion_strategy}")
            self.query_expander = get_query_expander(llm_provider=llm_provider)
        
        self.llm=self._initialize_llm(model_name)

        self.vector_store=None
        self.qa_chain=None
    def _initialize_llm(self,model_name:Optional[str]):
        """Initialize LLM based on provider."""
        if self.llm_provider=="gemini":
            api_key=os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY not set in environment variables.")
            
            # --- BUG FIX: Corrected model name ---
            model=model_name or "gemini-2.5-flash"
            
            return ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key,
                temperature=0.3,
                convert_system_message_to_human=True,
            )
        elif self.llm_provider=="llama":
            raise NotImplementedError("Llama provider not implemented yet.")
        else:
            raise ValueError(f"Unsupported LLM provider: {self.llm_provider}")
        
    def ingest_documents(self,pdf_paths:List[str])->int:
        """
        Ingest multiple PDF documents into the RAG system.
        Args:
            pdf_paths: List of PDF file paths.
        Returns:
            Number of chunks created
        """
        print(f"\n Processing {len(pdf_paths)} PDF documents...")
        extracted_docs=self.pdf_processor.process_multiple_pdfs(pdf_paths)
        all_chunks=[]
        for text,metadata in extracted_docs:
            chunks=self.chunker.create_hierarchical_chunks(text,metadata)
            all_chunks.extend(chunks)
        print(f"\n Created {len(all_chunks)} hierarchical chunks.")

        if self.vector_store_type=="faiss":
            # --- BUG FIX: Changed store name to match save/load methods ---
            self.vector_store=self.vector_store_manager.create_faiss_store(
                all_chunks,
                store_name="multi_doc_rag", 
            )
        elif self.vector_store_type=="chroma":
            self.vector_store=self.vector_store_manager.create_chroma_store(
                all_chunks,
                persist_directory="chroma_db",
                collection_name="rag_collection",
            )
        else:
            raise ValueError(f"Unsupported vector store type: {self.vector_store_type}")
        
        self._create_qa_chain()
        return len(all_chunks)
    
    def _retrieve_with_expansion(
        self,
        query: str,
        k: int = 10
    ) -> List[Document]:
        """
        # PATCH update: New retrieval method with query expansion support
        Retrieve documents with optional query expansion
        """
        
        if not self.use_query_expansion:
            # Standard retrieval
            return self.vector_store.similarity_search(query, k=k)
        
        # PATCH update: Query expansion logic
        if self.expansion_strategy == "multiquery":
            queries = self.query_expander.expand_query_multiquery(query, num_queries=2)
            print(f"📝 Expanded queries: {queries}")
            
            # Retrieve for each query and combine
            all_docs = []
            for q in queries:
                docs = self.vector_store.similarity_search(q, k=k//len(queries))
                all_docs.extend(docs)
            
            # Deduplicate based on content
            seen = set()
            unique_docs = []
            for doc in all_docs:
                content_hash = hash(doc.page_content)
                if content_hash not in seen:
                    seen.add(content_hash)
                    unique_docs.append(doc)
            
            return unique_docs[:k]
        
        elif self.expansion_strategy == "hyde":
            original_query, hypothetical = self.query_expander.expand_query_hyde(query)
            print(f"📝 HyDE hypothetical: {hypothetical[:150]}...")
            
            # Search using hypothetical document
            docs = self.vector_store.similarity_search(hypothetical, k=k)
            return docs
        
        elif self.expansion_strategy == "subquestions":
            subquestions = self.query_expander.expand_query_subquestions(query, max_subquestions=3)
            print(f"📝 Sub-questions: {subquestions}")
            
            # Retrieve for each sub-question
            all_docs = []
            for q in subquestions:
                docs = self.vector_store.similarity_search(q, k=k//len(subquestions))
                all_docs.extend(docs)
            
            # Deduplicate
            seen = set()
            unique_docs = []
            for doc in all_docs:
                content_hash = hash(doc.page_content)
                if content_hash not in seen:
                    seen.add(content_hash)
                    unique_docs.append(doc)
            
            return unique_docs[:k]
        
        return self.vector_store.similarity_search(query, k=k)
    
    def _create_qa_chain(self):
        """Create QA chain with custom prompt."""

        prompt_template="""
You are a helpful AI assistant with access to document context.
Use the following pieces of context to answer the question at the end.
If you can't find the answer from the documents i've uploaded then, just say that 'I could not find this information in the provided documents.'
Context:
{context}
Question: {question}

Answer:
Answer the question comprehensively based on the context provided
"""
        PROMPT=PromptTemplate(
            template=prompt_template,
            input_variables=["context","question"],
        )
        self.qa_chain=RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k":5},
            ),
            chain_type_kwargs={"prompt":PROMPT},
            return_source_documents=True,
        )
    def query(self, question: str, k: int = 10) -> Dict[str, Any]:
        """
        # PATCH update: Enhanced query with retrieval + reranking pipeline
        Enhanced query with retrieval + reranking
        
        Args:
            question: User question
            k: Number of initial documents to retrieve
            
        Returns:
            Dictionary with answer and sources
        """
        if not self.vector_store:
            raise ValueError("No documents ingested")
        
        # PATCH update: Step 1 - Retrieve with expansion
        retrieved_docs = self._retrieve_with_expansion(question, k=k)
        print(f"🔍 Retrieved {len(retrieved_docs)} documents")
        
        # PATCH update: Step 2 - Rerank if enabled
        if self.use_reranker and len(retrieved_docs) > 0:
            reranked_docs = self.reranker.rerank_documents(question, retrieved_docs)
            print(f"🎯 Reranked to top {len(reranked_docs)} documents")
            context_docs = reranked_docs
        else:
            context_docs = retrieved_docs[:5]
        
        # PATCH update: Step 3 - Generate answer with enhanced prompt
        context = "\n\n".join([
            f"[Source: {doc.metadata.get('source', 'Unknown')}]\n{doc.page_content}"
            for doc in context_docs
        ])
        
#         # PATCH update: Enhanced prompt with reasoning instructions
#         enhanced_prompt = f"""You are an expert assistant with deep analytical capabilities.

# Context from documents:
# {context}

# Question: {question}

# Instructions:
# 1. Analyze the provided context carefully to find relevant information
# 2. If the answer is not directly stated, infer from related information and context clues
# 3. Combine information from multiple sources if the answer is split across documents
# 4. Be comprehensive but accurate and add some descriptive answers if needed - cite which sources support your answer
# 5. If you cannot answer based on the context, explicitly state what information is missing

# Provide a detailed, well-reasoned answer:"""
        # PATCH: Replace the enhanced_prompt block in rag.py's query method (around line 297)

        # PATCH update: Enhanced prompt with reasoning instructions
        enhanced_prompt = f"""You are an expert assistant with deep analytical capabilities.

Context from documents:
{context}

Question: {question}

Instructions:
1. Analyze the provided context carefully to find relevant informations.
2. If the answer is not directly stated, infer from related information and context clues
3. Combine information from multiple sources if the answer is split across documents
4. Be comprehensive but accurate and add some descriptive answers if needed - cite which sources support your answer
5. If you cannot answer based on the context, explicitly state what information is missing

**Instructions:**

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
        response = self.llm.invoke(enhanced_prompt)
        
        return {
            'answer': response.content,
            'source_documents': context_docs,
            'num_sources': len(context_docs),
            'num_retrieved': len(retrieved_docs)
        }
    
    
    def query_with_sources(self,question:str)->Dict[str,Any]:
            """ Query and format response with sources
        
        Args:
            question: User question
            
        Returns:
            Formatted answer with sources
        """
            result = self.query(question)
            response = f"**Answer:**\n{result['answer']}\n\n"
            response += f"**Sources ({result['num_sources']}):**\n"

            for idx, doc in enumerate(result['source_documents'], 1):
                source = doc.metadata.get('source', 'Unknown')
                response += f"{idx}. {source} (Parent chunk: {doc.metadata.get('parent_chunk_id', 'N/A')})\n"

            return response       
    def save_vector_store(self,path:str='./vector_store'):
        """ Save vector store to disk."""
        if self.vector_store_type=="faiss":
            self.vector_store_manager.save_faiss_store("multi_doc_rag",path)
        else:
            print("ChromaDB persistence handled automatically.")
    def load_vector_store(self,path:str='./vector_store'):
        """ Load vector store from disk."""
        if self.vector_store_type=="faiss":
            self.vector_store=self.vector_store_manager.load_faiss_store("multi_doc_rag",path)
            self._create_qa_chain()
        else:
            print("ChromaDB loading handled automatically.")