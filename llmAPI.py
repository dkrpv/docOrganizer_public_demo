from flask import Flask, request, jsonify
import os
import json
from pathlib import Path
import ollama
import pdfplumber
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import numpy as np

app = Flask(__name__)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

sentence_model = SentenceTransformer("all-MiniLM-L6-v2")


def read_pdf(file_path):
    """Reads text content from a PDF file"""
    try:
        with pdfplumber.open(file_path) as pdf:
            pdf_text = "".join(page.extract_text() or "" for page in pdf.pages)
        if not pdf_text.strip():
            return None, "The file you uploaded does not contain readable text. It might be an image-based PDF."
        return pdf_text.encode("utf-8", errors="replace").decode("utf-8"), None
    except Exception as e:
        return None, f"Error reading the PDF: {str(e)}"


def vectorize_text(text):
    """Generates sentence embeddings for the given text"""
    sentences = text.splitlines()
    embeddings = sentence_model.encode(sentences)
    return {"sentences": sentences, "vectors": embeddings.tolist()}


def save_uploaded_file(file):
    """Saves the uploaded file and returns the file path"""
    user_id = request.form.get("user_id", "default")
    user_dir = UPLOAD_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)

    file_path = user_dir / file.filename
    file.save(file_path)
    return file_path, user_id


@app.route("/vectorize", methods=["POST"])
def vectorize_api():
    """API endpoint to process a PDF file and return vectorized data"""
    file = request.files.get("file")
    if not file or not file.filename.endswith(".pdf"):
        return jsonify({"error": "A valid PDF file is required."}), 400

    file_path, user_id = save_uploaded_file(file)

    try:
        text, error = read_pdf(file_path)
        if error:
            return jsonify({"error": error}), 400

        vectorized_data = vectorize_text(text)
        vectorized_file_path = file_path.with_suffix(".vec.json")

        vectorized_file_path.write_text(json.dumps(vectorized_data))

        return jsonify({"message": "File vectorized successfully.", "file": str(vectorized_file_path)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/upload", methods=["POST"])
def upload_file():
    """API endpoint to upload a file and vectorize its content"""
    file = request.files.get("file")
    if not file or not file.filename.endswith(".pdf"):
        return jsonify({"error": "A valid PDF file is required."}), 400

    file_path, user_id = save_uploaded_file(file)

    try:
        text, error = read_pdf(file_path)
        if error:
            return jsonify({"error": error}), 400

        if len(text.strip()) < 100:
            file_path.unlink()
            return jsonify({
                "message": "File uploaded successfully but not vectorized (too short).",
                "file": {"name": file.filename, "path": f"/uploads/{user_id}/{file.filename}"},
            }), 200

        vectorized_data = vectorize_text(text)
        vectorized_file_path = file_path.with_suffix(".vec.json")

        vectorized_file_path.write_text(json.dumps(vectorized_data))

        file_path.unlink()

        return jsonify({
            "message": "File uploaded and vectorized successfully.",
            "file": {"name": file.filename, "vectorPath": str(vectorized_file_path)},
        }), 200

    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        return jsonify({"error": str(e)}), 500


def choose_txt(message, files):
    """Chooses the most appropriate file based on the input message"""
    response = ollama.generate(
        model="docOrganizer",
        prompt=f"Given the question: {message}, choose one of these: {files}. Return file name only."
    )
    return response['response'].strip().replace('"', '').replace("'", '')


def list_files_for_user(user_id):
    """Lists all files available for a specific user"""
    user_dir = UPLOAD_DIR / user_id
    user_dir.mkdir(exist_ok=True)
    return [f.name for f in user_dir.iterdir() if f.is_file()]


def load_vectorized_data(file_path):
    """Loads vectorized data from a file"""
    return json.loads(file_path.read_text())


def find_most_relevant_chunk(query, vectorized_data):
    """Finds the most relevant text chunk for a given query"""
    query_embedding = sentence_model.encode([query])
    embeddings = np.array(vectorized_data["vectors"])
    similarities = cosine_similarity(query_embedding, embeddings)
    most_relevant_idx = np.argmax(similarities)
    return vectorized_data["sentences"][most_relevant_idx]


def get_valid_file(message, user_id, max_attempts=5):
    """Gets a valid file path by checking file existence within multiple attempts"""
    files = list_files_for_user(user_id)
    if not files:
        return None
    for _ in range(max_attempts):
        chosen_file = choose_txt(message, files)
        file_path = UPLOAD_DIR / user_id / chosen_file
        if file_path.is_file():
            return chosen_file
    return None


def process_message(message, user_id, memory, chat_history):
    """Processes a message to retrieve context and generate a response"""
    files = list_files_for_user(user_id)
    if not files:
        return "No files have been uploaded yet. Please upload a PDF to continue."

    chosen_file = get_valid_file(message, user_id)
    if not chosen_file:
        return "Unable to locate a valid file after multiple attempts."

    file_path = UPLOAD_DIR / user_id / chosen_file

    if chosen_file.endswith(".vec.json"):
        try:
            vectorized_data = load_vectorized_data(file_path)
            relevant_chunk = find_most_relevant_chunk(message, vectorized_data)

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

    return "Unsupported file type selected."


@app.route("/ask-question", methods=["POST"])
def ask_question():
    """Endpoint to process a question"""
    data = request.json
    message = data.get("message")
    user_id = data.get("user_id")
    memory = data.get("memory", "")
    chat_history = data.get("chat_history", "")

    if not message or not user_id:
        return jsonify({"error": "Message and User ID are required."}), 400

    response = process_message(message, user_id, memory, chat_history)
    return jsonify({"response": response})


@app.route("/test-question", methods=["GET"])
def test_question():
    """Simple test endpoint to ask a question"""
    message = request.args.get("message")
    user_id = request.args.get("user_id")
    memory = request.args.get("memory", "")
    chat_history = request.args.get("chat_history", "")

    if not message or not user_id:
        return jsonify({"error": "Message and User ID are required."}), 400

    response = process_message(message, user_id, memory, chat_history)
    return jsonify({"response": response})


if __name__ == "__main__":
    app.run(debug=True)
