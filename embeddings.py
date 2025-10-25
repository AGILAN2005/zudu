# from langchain.embeddings import HuggingFaceEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings
from typing import List
import os

class EmbeddingManager:
    def __init__(self,model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize Embedding model.
        
        Args:
            model_name (str): HuggingFace model identifier.
        """
        self.model_name=model_name
        self.embeddings = self._initialize_embeddings()
    def _initialize_embeddings(self) -> HuggingFaceEmbeddings:
        """Initialize HuggingFace embeddings"""
        return HuggingFaceEmbeddings(
            model_name=self.model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    def get_embeddings(self,text:str) -> List[float]:
        """
        Get embeddings for a given text.
        
        Args:
            text (str): Input text to embed."""
        return self.embeddings(text)
    def embed_text(self,text:str) -> List[float]:
        """
        Embed text using the initialized model.
        
        Args:
            text (str): Input text to embed.
        
        Returns:
            List[float]: Embedding vector.
        """
        return self.embeddings.embed_query(text)
    def embed_documents(self,text:List[str]) -> List[List[float]]:
        """
        Embed multiple documents.
        
        Args:
            texts: List of  texts to embed.
        
        Returns:
            List of embedding vectors.
        """
        return self.embeddings.embed_documents(text)    
def get_embedding_function():
    """
    Returns an embedding function using HuggingFace embeddings.
    """
    embedding_manager = EmbeddingManager()
    return embedding_manager.get_embeddings()