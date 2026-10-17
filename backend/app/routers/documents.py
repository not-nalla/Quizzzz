import os
import uuid
import shutil
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Depends
from app.models.schemas import DocumentResponse, ChunkResponse
from app.core.config import settings
from app.core.database import get_database
from app.core.deps import get_current_user, require_teacher
from app.services.ingestion.parser import DocumentParser
from app.services.ingestion.chunker import SemanticChunker
from app.services.ingestion.embedder import VectorEmbedder

router = APIRouter(tags=["Documents & Ingestion"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md"}
MAX_FILE_SIZE_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024

@router.post("/classrooms/{classroom_id}/documents/upload", response_model=DocumentResponse)
async def upload_document(
    classroom_id: str,
    file: UploadFile = File(...),
    unit: Optional[str] = Form(None),
    topic: Optional[str] = Form(None),
    current_user: dict = Depends(require_teacher),
):
    db = get_database()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    original_name = os.path.basename(file.filename or "notes.txt")
    file_extension = os.path.splitext(original_name)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file_extension or 'unknown'}'. Allowed: PDF, DOCX, PPTX, TXT, MD.",
        )

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    saved_filename = f"{doc_id}_{original_name}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)

    # Save uploaded file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE_BYTES:
        os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.MAX_FILE_SIZE_MB} MB upload limit.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    doc_record = {
        "_id": doc_id,
        "classroom_id": classroom_id,
        "filename": original_name,
        "file_url": file_path,
        "file_type": file.content_type or "application/octet-stream",
        "unit": unit or "Unit 1",
        "topic": topic or "Coursework Notes",
        "status": "processing",
        "page_count": 0,
        "chunk_count": 0,
        "size_bytes": file_size,
        "created_at": now_iso,
    }

    if db is not None:
        await db.documents.insert_one(doc_record)

    try:
        # Parse document pages/slides
        pages = DocumentParser.parse(file_path, original_name)
        page_count = len(pages) or 1

        # Semantic chunking (500–800 tokens, 100 overlap)
        chunks_data = SemanticChunker.chunk_document(
            pages=pages,
            target_chunk_tokens=600,
            overlap_tokens=100,
            unit=unit,
            topic=topic,
        )

        chunk_docs = []
        for chk in chunks_data:
            chunk_id = f"chk_{uuid.uuid4().hex[:12]}"
            # Generate vector embedding (Google Gemini or projection)
            vector = await VectorEmbedder.embed_text(chk["text"])
            chunk_docs.append({
                "_id": chunk_id,
                "classroom_id": classroom_id,
                "doc_id": doc_id,
                "filename": original_name,
                "text": chk["text"],
                "token_count": chk["token_count"],
                "page": chk["page"],
                "unit": chk["unit"],
                "topic": chk["topic"],
                "chunk_index": chk["chunk_index"],
                "vector": vector,
            })

        if db is not None and chunk_docs:
            await db.chunks.insert_many(chunk_docs)
            await db.documents.update_one(
                {"_id": doc_id},
                {"$set": {
                    "status": "ready",
                    "page_count": page_count,
                    "chunk_count": len(chunk_docs),
                }}
            )

            # Log course activity
            await db.activities.insert_one({
                "_id": f"act_{uuid.uuid4().hex[:8]}",
                "classroom_id": classroom_id,
                "type": "document",
                "title": f"Notes Vectorized: {original_name}",
                "detail": f"{len(chunk_docs)} semantic chunks indexed with vector search embeddings.",
                "actor": current_user["name"],
                "created_at": now_iso,
            })

        return DocumentResponse(
            id=doc_id,
            classroom_id=classroom_id,
            filename=original_name,
            file_type=file.content_type or "application/pdf",
            unit=unit,
            topic=topic,
            status="ready",
            page_count=page_count,
            chunk_count=len(chunk_docs),
            size_bytes=file_size,
            created_at=now_iso,
        )

    except Exception as e:
        if db is not None:
            await db.documents.update_one({"_id": doc_id}, {"$set": {"status": "failed"}})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document parsing/vectorization pipeline failed: {str(e)}",
        )

@router.get("/classrooms/{classroom_id}/documents", response_model=List[DocumentResponse])
async def list_documents(classroom_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    documents = []
    if db is not None:
        cursor = db.documents.find({"classroom_id": classroom_id}).sort("created_at", -1)
        async for doc in cursor:
            documents.append(DocumentResponse(
                id=str(doc["_id"]),
                classroom_id=doc["classroom_id"],
                filename=doc["filename"],
                file_type=doc.get("file_type", "application/pdf"),
                unit=doc.get("unit"),
                topic=doc.get("topic"),
                status=doc.get("status", "ready"),
                page_count=doc.get("page_count", 1),
                chunk_count=doc.get("chunk_count", 0),
                size_bytes=doc.get("size_bytes", 0),
                created_at=doc.get("created_at", ""),
            ))
    return documents

@router.get("/documents/{document_id}/chunks", response_model=List[ChunkResponse])
async def get_document_chunks(document_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    chunks = []
    if db is not None:
        cursor = db.chunks.find({"doc_id": document_id}).sort("chunk_index", 1)
        async for chk in cursor:
            chunks.append(ChunkResponse(
                id=str(chk["_id"]),
                doc_id=chk["doc_id"],
                classroom_id=chk["classroom_id"],
                text=chk["text"],
                token_count=chk["token_count"],
                page=chk["page"],
                unit=chk.get("unit"),
                topic=chk.get("topic"),
            ))
    return chunks

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, current_user: dict = Depends(require_teacher)):
    db = get_database()
    if db is not None:
        # Cascading deletion (DOC-4)
        await db.chunks.delete_many({"doc_id": document_id})
        await db.documents.delete_one({"_id": document_id})
    return {"status": "deleted", "document_id": document_id}
