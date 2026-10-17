import re
from typing import List, Dict, Any, Optional

class SemanticChunker:
    @staticmethod
    def estimate_tokens(text: str) -> int:
        # Standard academic approximation: 1 token ~= 4 characters or ~0.75 words
        return max(1, len(text.split()))

    @classmethod
    def chunk_document(
        cls,
        pages: List[Dict[str, Any]],
        target_chunk_tokens: int = 600,
        overlap_tokens: int = 100,
        unit: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        chunks = []
        chunk_idx = 0

        for page_data in pages:
            page_num = page_data["page"]
            text = page_data["text"]

            # Split into paragraphs and sentences
            paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
            if not paragraphs:
                continue

            current_chunk_words = []
            current_token_count = 0

            for para in paragraphs:
                words = para.split()
                if not words:
                    continue

                if current_token_count + len(words) <= target_chunk_tokens:
                    current_chunk_words.extend(words)
                    current_token_count += len(words)
                else:
                    # Flush current chunk
                    if current_chunk_words:
                        chunk_text = " ".join(current_chunk_words)
                        chunks.append({
                            "chunk_index": chunk_idx,
                            "page": page_num,
                            "text": chunk_text,
                            "token_count": len(current_chunk_words),
                            "unit": unit,
                            "topic": topic,
                        })
                        chunk_idx += 1
                        # Retain overlap words
                        overlap_words = current_chunk_words[-overlap_tokens:] if len(current_chunk_words) > overlap_tokens else []
                        current_chunk_words = overlap_words + words
                        current_token_count = len(current_chunk_words)
                    else:
                        current_chunk_words = words
                        current_token_count = len(words)

            if current_chunk_words:
                chunk_text = " ".join(current_chunk_words)
                chunks.append({
                    "chunk_index": chunk_idx,
                    "page": page_num,
                    "text": chunk_text,
                    "token_count": len(current_chunk_words),
                    "unit": unit,
                    "topic": topic,
                })
                chunk_idx += 1

        return chunks
