import os
from rag import RAGSystem

ragsys=RAGSystem(
    llm_provider="gemini",
    vector_store_type="faiss"
)
pdf_files=[]
existing_pdfs = [f for f in pdf_files if os.path.exists(f)]
if existing_pdfs:
    num_chunks=ragsys.ingest_documents(existing_pdfs)
    questions=[""]
    for question in questions:
        print(f"Question: {question}")
        answers=ragsys.answer_question(question,top_k=3)
        for ans in answers:
            print(f"Answer: {ans}\n")
    ragsys.save_vector_store()
else:
    print("No PDF files found to ingest.")