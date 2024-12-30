import sys
import json
import pdfplumber
from sentence_transformers import SentenceTransformer

def read_pdf(file_path):
    """Reads the content of a PDF file and returns its text."""
    try:
        with pdfplumber.open(file_path) as pdf:
            pdf_text = "".join(page.extract_text() or "" for page in pdf.pages)
        return pdf_text
    except Exception as e:
        raise RuntimeError(f"Error reading PDF: {str(e)}")

def vectorize_text(text):
    """Generates sentence embeddings for the given text."""
    model = SentenceTransformer("all-MiniLM-L6-v2")
    sentences = text.split("\n")
    embeddings = model.encode(sentences)
    return {"sentences": sentences, "vectors": embeddings.tolist()}

if __name__ == "__main__":
    """Main script to process a PDF file and output vectorized data."""
    if len(sys.argv) != 2:
        sys.exit(1)
    pdf_file_path = sys.argv[1]
    try:
        text = read_pdf(pdf_file_path)
        if len(text) < 40000:
            print(0)
            sys.exit(0)
        vectorized_data = vectorize_text(text)
        print(json.dumps(vectorized_data))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)