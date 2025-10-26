from langchain_huggingface import HuggingFaceEmbeddings
from FlagEmbedding import FlagModel
from typing import List
import os

class EmbeddingManager:
    #PATCH
    EMBEDDING_MODELS={
        'minilm': 'sentence-transformers/all-MiniLM-L6-v2', 
        'e5-large': 'intfloat/e5-large-v2', 
        'e5-mistral': 'intfloat/e5-mistral-7b-instruct',
        'bge-large': 'BAAI/bge-large-en-v1.5',
        'bge-m3': 'BAAI/bge-m3', 
        'gte-large': 'Alibaba-NLP/gte-large-en-v1.5',
    }
    def __init__(
            self,
            model_name: str = "bge-large",
            use_flag_embedding:bool=True,
            device:str='cpu'
        ):
        """
        Initialize Embedding model.
        
        Args:
            model_name (str): HuggingFace model identifier.
        """
        self.model_key=model_name
        self.model_name=self.EMBEDDING_MODELS.get(model_name,self.EMBEDDING_MODELS['bge-large'])
        self.device=device
        self.use_flag_embedding=use_flag_embedding and model_name.startswith('bge')
        self.embeddings = self._initialize_embeddings()

    def _initialize_embeddings(self) -> HuggingFaceEmbeddings:
        """Initialize HuggingFace embeddings"""
        if self.use_flag_embedding:
            return FlagModel(
                self.model_name,
                query_instruction_for_retrieval="Represent this query for searching relevant passages:",
                use_fp16=True
            )
        encode_kwargs={'normalize_embeddings':True}

        if 'e5' in self.model_name:
            encode_kwargs['show_progress_bar']=False
        return HuggingFaceEmbeddings(
            model_name=self.model_name,
            model_kwargs={"device": self.device},
            encode_kwargs=encode_kwargs
        )

    def get_embeddings(self) -> HuggingFaceEmbeddings:
        """Return embeddings instance"""
        if self.use_flag_embedding:
            return FlagEmbeddingWrapper(self.embeddings)
        return self.embeddings
    
    def embed_query(self,query:str,add_instruction:bool=True)->List[float]:
        """
        Embed query text with model-specific optimizations
        
        Args:
            query: Query text
            add_instruction: Add instruction prefix for E5/BGE models
            
        Returns:
            Embedding vector
        """
        if self.use_flag_embedding:
            return self.embeddings.encode_queries([query])[0].tolist()
        if 'e5' in self.model_name and add_instruction:
            query=f"query: {query}"
        return self.embeddings.embed_query(query)
    
    def embed_text(self,text:str) -> List[float]:
        """
        Embed text using the initialized model.
        
        Args:
            text (str): Input text to embed.
        
        Returns:
            List[float]: Embedding vector.
        """
        return self.embeddings.embed_query(text)
    def embed_documents(self,text:List[str],add_instruction:bool=True) -> List[List[float]]:
        """
        Embed multiple documents.
        
        Args:
            texts: List of  texts to embed.
        
        Returns:
            List of embedding vectors.
        """
        if self.use_flag_embedding:
            return self.embeddings.encode(texts).tolist()
        
        if 'e5' in self.model_name and add_instruction:
            texts = [f"passage: {text}" for text in texts]
        
        return self.embeddings.embed_documents(texts)

class FlagEmbeddingWrapper:
    """Wrapper to make FlagModel compatible with LangChain"""
    
    def __init__(self, flag_model: FlagModel):
        self.flag_model = flag_model
    
    def embed_query(self, text: str) -> List[float]:
        """Embed query text"""
        return self.flag_model.encode_queries([text])[0].tolist()
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed documents"""
        return self.flag_model.encode(texts).tolist()


def get_embedding_function(model_name:str='bge-large',device:str='cpu'):
    """
    Returns an embedding function using HuggingFace embeddings.
    """
    embedding_manager = EmbeddingManager(
        model_name=model_name,
        device=device
    )
    return embedding_manager.get_embeddings()