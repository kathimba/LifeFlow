from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import uvicorn
import io

app = FastAPI()
model = SentenceTransformer("all-MiniLM-L6-v2")

class EmbedRequest(BaseModel):
    texts: list[str]

class EmbedResponse(BaseModel):
    embeddings: list[list[float]]

@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    embeddings = model.encode(request.texts, normalize_embeddings=True)
    return EmbedResponse(embeddings=embeddings.tolist())

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """Extract text from PDF files."""
    content = await file.read()
    mime = file.content_type or ""

    try:
        if mime == "application/pdf":
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return {"text": text.strip()}

        return {"text": ""}

    except Exception as e:
        return {"text": "", "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)