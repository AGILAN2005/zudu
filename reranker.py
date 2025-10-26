import os
from typing import List,Tuple
from langchain.schema import Document
try:
    from flashrank import Ranker,RerankRequest
    FLASHRANK_AVAILABLE=True
except ImportError:
    FLASHRANK_AVAILABLE=False
try:
    import cohere
    COHERE_AVAILABLE=True
except ImportError:
    COHERE_AVAILABLE=False
try:
    from FlagEmbedding import FlagReranker
    BGE_RERANKER_AVAILABLE = True
except ImportError:
    BGE_RERANKER_AVAILABLE = False

class RerankerManager:
    """
    # PATCH update: New class for document reranking
    Manages reranking of retrieved documents
    Improves relevance by reordering based on cross-encoder models
    """
    RERANKER_MODELS = {
        'bge-reranker-base': 'BAAI/bge-reranker-base',
        'bge-reranker-large': 'BAAI/bge-reranker-large',
        'bge-reranker-v2-m3': 'BAAI/bge-reranker-v2-m3',
        'flashrank': 'ms-marco-MiniLM-L-12-v2',  # Lightweight, fast
        'cohere': 'rerank-english-v3.0',  # Best performance, requires API
    }
    
    def __init__(
        self,
        model_name: str = 'bge-reranker-large',
        top_n: int = 5,
        device: str = 'cpu'
    ):
        """
        Initialize reranker
        
        Args:
            model_name: Reranker model key
            top_n: Number of top documents to return after reranking
            device: 'cpu' or 'cuda'
        """
        self.model_name = model_name
        self.top_n = top_n
        self.device = device
        self.reranker = self._initialize_reranker()
    
    def _initialize_reranker(self):
        """# PATCH update: Initialize reranker model based on selection"""
        
        if self.model_name == 'flashrank':
            if not FLASHRANK_AVAILABLE:
                raise ImportError("Install flashrank: pip install flashrank")
            return Ranker(model_name=self.RERANKER_MODELS['flashrank'])
        
        elif self.model_name == 'cohere':
            if not COHERE_AVAILABLE:
                raise ImportError("Install cohere: pip install cohere")
            api_key = os.getenv('COHERE_API_KEY')
            if not api_key:
                raise ValueError("COHERE_API_KEY not found in environment")
            return cohere.Client(api_key)
        
        elif self.model_name.startswith('bge-reranker'):
            if not BGE_RERANKER_AVAILABLE:
                raise ImportError("Install FlagEmbedding: pip install FlagEmbedding")
            model_path = self.RERANKER_MODELS.get(self.model_name)
            return FlagReranker(model_path, use_fp16=True)  # PATCH update: fp16 for speed
        
        else:
            raise ValueError(f"Unsupported reranker: {self.model_name}")
    
    def rerank_documents(
        self,
        query: str,
        documents: List[Document]
    ) -> List[Document]:
        """
        # PATCH update: Core reranking functionality
        Rerank documents based on query relevance
        
        Args:
            query: User query
            documents: List of retrieved documents
            
        Returns:
            Reranked documents (top_n)
        """
        if not documents:
            return []
        
        if self.model_name == 'flashrank':
            return self._rerank_flashrank(query, documents)
        
        elif self.model_name == 'cohere':
            return self._rerank_cohere(query, documents)
        
        elif self.model_name.startswith('bge-reranker'):
            return self._rerank_bge(query, documents)
    
    def _rerank_flashrank(self, query: str, documents: List[Document]) -> List[Document]:
        """# PATCH update: FlashRank reranking implementation"""
        passages = [
            {"id": i, "text": doc.page_content}
            for i, doc in enumerate(documents)
        ]
        
        rerank_request = RerankRequest(query=query, passages=passages)
        results = self.reranker.rerank(rerank_request)
        
        reranked_docs = [
            documents[result['id']]
            for result in results[:self.top_n]
        ]
        
        return reranked_docs
    
    def _rerank_cohere(self, query: str, documents: List[Document]) -> List[Document]:
        """# PATCH update: Cohere API reranking implementation"""
        texts = [doc.page_content for doc in documents]
        
        results = self.reranker.rerank(
            query=query,
            documents=texts,
            top_n=self.top_n,
            model=self.RERANKER_MODELS['cohere']
        )
        
        reranked_docs = [
            documents[result.index]
            for result in results.results
        ]
        
        return reranked_docs
    
    def _rerank_bge(self, query: str, documents: List[Document]) -> List[Document]:
        """# PATCH update: BGE reranker implementation"""
        texts = [doc.page_content for doc in documents]
        
        pairs = [[query, text] for text in texts]
        
        scores = self.reranker.compute_score(pairs)
        
        if isinstance(scores, float):
            scores = [scores]
        
        scored_docs = list(zip(scores, documents))
        scored_docs.sort(reverse=True, key=lambda x: x[0])
        
        reranked_docs = [doc for _, doc in scored_docs[:self.top_n]]
        
        return reranked_docs


def get_reranker(model_name: str = 'bge-reranker-large', top_n: int = 5):
    """
    Factory function to get reranker instance
    
    Args:
        model_name: Reranker model key
        top_n: Number of documents to return
        
    Returns:
        RerankerManager instance
    """
    return RerankerManager(model_name=model_name, top_n=top_n)
