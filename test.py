import os
from rag import RAGSystem

# It's good practice to wrap your main script logic in this block
if __name__ == "__main__":
    ragsys = RAGSystem(
        llm_provider="gemini",
        vector_store_type="faiss"
    )

    # --- FIX 1: Use a raw string (r"...") for Windows paths ---
    # This prevents errors from characters like \U, \n, \t, etc.
    pdf_files = [r"dhaksana\Demand Forecasting .pdf",r"dhaksana\Environmental Scanning .pdf",r"dhaksana\UNIT 3.pdf",r"dhaksana\UNIT 4 (1).pdf"]
    
    existing_pdfs = [f for f in pdf_files if os.path.exists(f)]

    if existing_pdfs:
        print(f"Found and processing: {existing_pdfs[0]}...")
        num_chunks = ragsys.ingest_documents(existing_pdfs)
        print(f"Ingested {num_chunks} chunks.")

        questions = [
            "Jio disrupted a large market. What is the technical term for a market dominated by just two major competitors?",
            "What does the acronym 'URL' stand for, and what language is used for defining the structure of web pages?",
            "What term describes the market state where quantity supplied equals quantity demanded?"
        ]

        for question in questions:
            print(f"\n--- Question: {question} ---")
            
            # --- FIX 2: This is the main correction ---
            # The 'query_with_sources' method returns a single string, not a list.
            # We assign that string to 'answer' and print it directly.
            
            answer = ragsys.query_with_sources(question)
            
            # Removed the incorrect 'for ans in answers:' loop
            print(answer) 
            
            print("="*50) # Added a separator for readability

        print("\nSaving vector store to disk...")
        ragsys.save_vector_store()
        print("Done.")

    else:
        print(f"Error: PDF file not found at path: {pdf_files[0]}")
        print("Please check the file path in your test.py script.")