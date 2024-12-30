import sys
import ollama

def process_message(message):
    """Processes a user message to extract a key fact and rate its importance."""
    fact_query = (f"{message} - Extract a 4 word note about the user from this message and return that only. "
                  "Return 0 if user doesn't say anything about themselves. Don't say anything but the required return.")
    generated_fact = ollama.generate(model="docOrganizer", prompt=fact_query)
    fact_response = generated_fact['response'].strip().replace('"', '').replace("'", '')

    if fact_response == "0":
        return "0"

    importance_query = (f"The fact '{fact_response}' was extracted about the user. Rate its importance "
                        "(0-5). Only return the number.")
    importance_rating = ollama.generate(model="docOrganizer", prompt=importance_query)['response'].strip()

    try:
        importance_rating = int(importance_rating)
    except ValueError:
        importance_rating = 0

    return fact_response if importance_rating >= 4 else "0"

if __name__ == "__main__":
    """Main script to extract and evaluate user-provided information from a message."""
    if len(sys.argv) < 2:
        print("Message argument required.")
        sys.exit(1)

    message = sys.argv[1]
    result = process_message(message)
    if result:
        print(result)