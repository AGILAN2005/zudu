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
            "What is the fundamental difference in traffic (organic vs. paid) and one corresponding success metric for MakeMyTrip and OYO Rooms?",
            "How did the company's content marketing address the challenge of 'Complex Product Understanding' in the insurance sector?",
            "How do personalized recommendations (using predictive analytics) and campaign optimization enhance both customer experience and ROI?",
            "Identify the specific campaign that served as a core example of both 'Emotional Branding' and the company's 'Social Responsibility.'",
            "What keyword strategy did both MakeMyTrip (SEO) and OYO Rooms (SEM) use to reduce competition and advertising costs, and why is it effective for both?",
            "What is the Core Product of a smartphone, and which vehicle did Tata Motors position for the ''people's car'' segment?",
            "What four dimensions define a company's Product Mix, and which two main categories did HUL use to achieve its wide market share?",
            "How did Marico's Product Differentiation strategy for Parachute and Saffola specifically address the challenge of 'Changing Consumer Preferences'?",
            "What is the primary objective of Integrated Marketing Communication (IMC), and what unifying mascot did Amul use to maintain consistency?",
            "What Differentiation Strategy did Royal Enfield use by organizing events like Rider Mania, and which two types of CRM did HDFC Bank apply?",
            "What was the primary solution ITC implemented to address the challenge of 'Supply Chain Disruptions,' and which technological investment supported this?",
            "Beyond product launches, how does ITC's 'Sustainability and CSR Monitoring' contribute to its competitive edge and stakeholder relationships?",
            "what is the difference between what 'Continuous Monitoring' helps a company reduce, and what 'Adaptability' is essential for maintaining?",
            "besides Historical Data Analysis, name the two other categories of sophisticated models Maruti Suzuki uses to predict demand accurately.",
            "State the approximate percentage by which Maruti Suzuki reduced forecast errors and the separate percentage reduction achieved in excess inventory costs.",
            "what is the two-part focus of Maruti Suzuki's future outlook regarding new product lines and new markets?",

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