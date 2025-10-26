"""
# PATCH update: New file for query expansion techniques
Query expansion and rephrasing techniques
Addresses: Conceptual mismatch, different wording
"""

import os
from typing import List, Optional
from dotenv import load_dotenv

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

load_dotenv('.env')


class QueryExpander:
    """
    # PATCH update: New class for query expansion
    Expands queries using multiple strategies:
    1. Multi-query generation (synonym/rephrase)
    2. HyDE (Hypothetical Document Embeddings)
    3. Sub-question decomposition
    """
    
    def __init__(
        self,
        llm_provider: str = 'gemini',
        model_name: Optional[str] = None
    ):
        """
        Initialize query expander
        
        Args:
            llm_provider: 'gemini' or 'openai'
            model_name: Specific model to use
        """
        self.llm_provider = llm_provider
        self.llm = self._initialize_llm(model_name)
    
    def _initialize_llm(self, model_name: Optional[str]):
        """# PATCH update: Initialize LLM for query expansion"""
        
        if self.llm_provider == 'gemini':
            if not GEMINI_AVAILABLE:
                raise ImportError("Install: pip install langchain-google-genai")
            
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                raise ValueError("GEMINI_API_KEY not found")
            
            return ChatGoogleGenerativeAI(
                model=model_name or "gemini-2.5-flash",
                google_api_key=api_key,
                temperature=0.7  # PATCH update: Higher temp for diversity
            )
        
        elif self.llm_provider == 'openai':
            if not OPENAI_AVAILABLE:
                raise ImportError("Install: pip install openai")
            
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found")
            
            return OpenAI(api_key=api_key)
        
        else:
            raise ValueError(f"Unsupported LLM provider: {self.llm_provider}")
    
    def expand_query_multiquery(
        self,
        query: str,
        num_queries: int = 3
    ) -> List[str]:
        """
        # PATCH update: Multi-query expansion strategy
        Generate multiple reformulations of the query
        
        Args:
            query: Original user query
            num_queries: Number of alternative queries to generate
            
        Returns:
            List of queries (includes original)
        """
        prompt = f"""Generate {num_queries} alternative ways to phrase the following query.
The alternatives should have the same intent but use different wording, synonyms, or perspectives.

Original query: {query}

Return only the alternative queries, one per line, without numbering or explanations."""
        
        if self.llm_provider == 'gemini':
            response = self.llm.invoke(prompt)
            expanded = response.content.strip().split('\n')
        else:
            response = self.llm.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}]
            )
            expanded = response.choices[0].message.content.strip().split('\n')
        
        # Clean and add original query
        expanded = [q.strip() for q in expanded if q.strip()]
        return [query] + expanded[:num_queries]
    
    def expand_query_hyde(self, query: str) -> tuple[str, str]:
        """
        # PATCH update: HyDE (Hypothetical Document Embeddings) strategy
        Generate hypothetical document that would answer the query
        
        Args:
            query: Original user query
            
        Returns:
            Tuple of (original_query, hypothetical_answer)
        """
        prompt = f"""You are an expert assistant. Generate a detailed, factual passage that would answer the following question.
Write as if this passage appears in a comprehensive document or article.

Question: {query}

Hypothetical passage:"""
        
        if self.llm_provider == 'gemini':
            response = self.llm.invoke(prompt)
            hypothetical = response.content.strip()
        else:
            response = self.llm.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            hypothetical = response.choices[0].message.content.strip()
        
        return query, hypothetical
    
    def expand_query_subquestions(
        self,
        query: str,
        max_subquestions: int = 3
    ) -> List[str]:
        """
        # PATCH update: Sub-question decomposition strategy
        Break down complex query into simpler sub-questions
        
        Args:
            query: Complex user query
            max_subquestions: Maximum number of sub-questions
            
        Returns:
            List of sub-questions
        """
        prompt = f"""Break down the following complex question into {max_subquestions} simpler, focused sub-questions.
Each sub-question should address a specific aspect of the original question.

Original question: {query}

Return only the sub-questions, one per line, without numbering."""
        
        if self.llm_provider == 'gemini':
            response = self.llm.invoke(prompt)
            subquestions = response.content.strip().split('\n')
        else:
            response = self.llm.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}]
            )
            subquestions = response.choices[0].message.content.strip().split('\n')
        
        # Clean and filter
        subquestions = [q.strip() for q in subquestions if q.strip()]
        return subquestions[:max_subquestions]


# PATCH update: Factory function for query expander
def get_query_expander(llm_provider: str = 'gemini'):
    """
    Factory function to get query expander
    
    Args:
        llm_provider: 'gemini' or 'openai'
        
    Returns:
        QueryExpander instance
    """
    return QueryExpander(llm_provider=llm_provider)
