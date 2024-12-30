# docOrganizer

---

## Architecture

**Tech Stack**  
- **Backend**: Node.js with Express and MongoDB for main API and data storage.
- **Python Spawned Processes**: (or Django in the future) For document processing and question answering.
- **Frontend**: React.js
- **NLP Model**: llama3.2 with a custom modelfile with lowered temperature to reduce hallucinations and custom return instructions.

---

## Workflow

1. **User Uploads**  
   - Users upload a batch of documents.
   - Node.js with Express handles file uploads using `multer` or similar.
   - Documents are stored temporarily for processing.

2. **Document Processing**  
   - Node.js spawns a Python process to process documents
   - Python extracts text, generates embeddings, and summarizes content for title and searchability.
   - Processed data (text, title, embeddings) is stored in MongoDB.

3. **Q&A Functionality**  
   - Node.js receives user questions.
   - Node.js spawns a Python process to retrieve relevant document sections.
   - Python generates answers based on retrieved content and returns them to Node.js.

4. **User Memory & Tracking**
   - Store personalized history in MongoDB to enhance responses with user-specific context
   - Implement follow-up question context tracking.

5. **Subscription Management**  
   - Enforces paywall.
   - Track usage limits and allow or deny access based on subscription level

6. **Frontend User Experience**  
   - Document upload dashboard.
   - Q&A interface with support for follow-up questions.
   - User account page for managing subscriptions and data retention settings.

---

## Components

### User Document Upload

- **File Verification**: Ensure correct format, PDF and possibly various .
- **Size & Batch Limits**: Restrict based on subscription level.
- **Encryption**: Secure files in transit and storage.

### Document Processing (Python)

- **Text Extraction**: Extract text content from documents (possibly splitting as done before).
- **Embedding Creation**: Generate embeddings to store in MongoDB.
- **Summarization**: Generate brief summaries to improve search speed.

### Question-Answering Interface

- **Query Handling**: Receive questions and spawn Python processes to fetch answers.
- **Context Awareness**: Track and store conversation history for follow-up questions.
- **Markdown**: Llama likes using markdown in its responses, add support.

### User Memory & Context

- **Question History**: Store question/answer pairs for each user.
- **Contextual Memory**: Persist key facts or document excerpts for personalized answers.
- **Data Retention**: Allow users to manage stored memory and clear data.

### Subscription and Paywall (Node.js)

- **Tiered Access**: Restrict document and question limits by subscription.
- **Payment Gateway**: Integrate Stripe or PayPal for subscriptions.
- **Usage Monitoring**: Track and log API calls and user actions in MongoDB.

---