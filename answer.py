import os
import sys
import json
import subprocess
import ollama
import pdfplumber
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import numpy as np

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def choose_txt(message, files):
    """Chooses the most appropriate file based on the input message."""
    generated_split_choice = ollama.generate(
        model="docOrganizer", 
        prompt=f"Given the question: {message}, choose one of these: {files}. Return file name only."
    )
    name_txt = generated_split_choice['response']
    name_txt = name_txt.strip().replace('"', '').replace("'", '')
    return name_txt

def list_files_for_user(user_id):
    """Lists all files available for a specific user."""
    base_upload_dir = "uploads"
    user_dir = os.path.join(base_upload_dir, user_id)
    if not os.path.exists(user_dir):
        os.makedirs(user_dir)
    files = os.listdir(user_dir)
    return files

def read_pdf(file_path):
    """Reads text content from a PDF file."""
    try:
        with pdfplumber.open(file_path) as pdf:
            pdf_text = "".join(page.extract_text() or "" for page in pdf.pages)
        if not pdf_text.strip():
            return None, "The file you uploaded does not contain readable text. It might be an image-based PDF."

        pdf_text = pdf_text.encode('utf-8', errors='replace').decode('utf-8')

        return pdf_text, None
    except Exception as e:
        return None, f"Error reading the PDF: {str(e)}"

def load_vectorized_data(file_path):
    """Loads vectorized data"""
    with open(file_path, "r") as f:
        return json.load(f)

def find_most_relevant_chunk(query, vectorized_data, model):
    """Finds the most relevant text chunk for a given query."""
    query_embedding = model.encode([query])
    embeddings = np.array(vectorized_data["vectors"])
    similarities = cosine_similarity(query_embedding, embeddings)
    most_relevant_idx = np.argmax(similarities)
    return vectorized_data["sentences"][most_relevant_idx]

def get_valid_file(message, user_id, max_attempts=5):
    """Gets a valid file path by checking file existence within multiple attempts."""
    files = list_files_for_user(user_id)
    if not files:
        return None

    attempt = 0

    while attempt < max_attempts:
        chosen_file = choose_txt(message, files)
        file_path = os.path.join("uploads", user_id, chosen_file)

        if os.path.isfile(file_path):
            return chosen_file

        attempt += 1

    return None

def process_message(message, user_id, memory, chat_history):
    """Processes a message to retrieve context and generate a response."""
    files = list_files_for_user(user_id)
    if not files:
        return "No files have been uploaded yet. Please upload a PDF to continue."

    chosen_file = get_valid_file(message, user_id)
    if not chosen_file:
        return "Unable to locate a valid file after multiple attempts."

    file_path = os.path.join("uploads", user_id, chosen_file)

    if chosen_file.endswith(".vec.json"):
        try:
            vectorized_data = load_vectorized_data(file_path)
            model = SentenceTransformer("all-MiniLM-L6-v2")
            relevant_chunk = find_most_relevant_chunk(message, vectorized_data, model)

            response = ollama.generate(
                model="docOrganizer",
                prompt=(
                    f"User memory: {memory}\n"
                    f"Chat history: {chat_history}\n"
                    f"Relevant context: {relevant_chunk}\n"
                    f"Answer the question with one sentence: {message}"
                ),
            )
            return response["response"]
        except Exception as e:
            return f"Error processing vectorized data: {str(e)}"

    elif chosen_file.endswith(".pdf"):
        pdf_text, error = read_pdf(file_path)
        if error:
            return error

        response = ollama.generate(
            model="docOrganizer",
            prompt=(
                f"User memory: {memory}\n"
                f"Chat history: {chat_history}\n"
                f"Relevant context: {pdf_text}\n"
                f"Answer the question with one sentence: {message}"
            ),
        )
        return response["response"]

    else:
        return "Unsupported file type selected."

if __name__ == "__main__":
    """Main script to process input arguments and generate a response."""
    if len(sys.argv) < 5:
        print("Message, User ID, Memory, and Chat History arguments are required.")
        sys.exit(1)

    message = sys.argv[1]
    user_id = sys.argv[2]
    memory = sys.argv[3]
    chat_history = sys.argv[4]

    response = process_message(message, user_id, memory, chat_history)
    print(response)