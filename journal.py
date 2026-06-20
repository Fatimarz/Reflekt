from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from auth import get_current_user
from models import Journal
from datetime import date, datetime, timezone
from fastapi.responses import StreamingResponse
import httpx
import os, json
from groq import Groq
from sqlalchemy.exc import IntegrityError
from models import DailyInsight, DailyInsightsDashboard
import re
from fastapi import UploadFile, File
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from sentence_transformers import SentenceTransformer
from models import ImportedEntry, EntryEmbedding, ChatSession, ChatMessage
from docx import Document as DocxDocument

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

#all the endpoints start with this router will start from journal
router=APIRouter(prefix="/journal", tags=["journal"])

#verifying the type of incoming data and it should be string
class JournalRequest(BaseModel):
    content: str

#creates db session that allows to talk to database
def get_db():
    db=SessionLocal()
    try: 
        yield db 
    finally:
        db.close()


#function which will input the journal entries and generate interesting insight
async def generate_insight(entries: list[str]) -> str:
    groq_api_key = os.getenv("GROQ_API_KEY")  # store your key in .env, never hardcode it
    if not groq_api_key:
        return "Add your GROQ_API_KEY to your .env file to enable insights."

    # join all entries into one block of text to send to the model
    entries_text = "\n\n".join([f"Entry {i+1}: {e}" for i, e in enumerate(entries)])

    system_prompt = """Analyze multiple journal entries and extract ONE emotional or behavioral pattern.

Rules:
- Identify ONE clear pattern only.
- Keep it short, natural, and conversational like a quick personal observation.
- Sentence 1: state the pattern/trigger based on real journal entries (no interpretation or conclusions).
- Sentence 2: reflect on the identified pattern's emotional experience in simple, everyday language.
- Do not use clinical abstract or difficult vocabalory.
- Do not repeat the same idea in different wording across sentences.
- Avoid stacking multiple ideas or implications in a single sentence.
- Do not generalize beyond what is directly visible in the entries.
- Dont use phrases like in these 'journal entries' etc
"""


    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here are my journal entries:\n\n{entries_text}"}
        ],
        "max_tokens": 120,  # keeps the response short and card-sized
        "temperature": 0.6, # slight creativity so it doesn't sound robotic
    }


#creates http client to make API call to groq,send post request to that URL , pass the api key and our data, it will return the response and we will extract text from it 
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15.0,  # don't hang forever if Groq is slow
        )
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()


#creating 'insight' endpoint with read method, takes input db session and user info returned by get_current_user function. will get the user id and today's date
# stores id and todays date in cache key if exists then it will return, else will save it. fetch all the entries of current logged in user order by latest
#  get the latest 10. if there is no entry then nothing will display on card, call the function by passing it the entries and cache it to be used by today. 

@router.get("/insight")
async def get_insight(db: Session = Depends(get_db),
                       user = Depends(get_current_user)
):
    user_id = user["id"]
    today = date.today()

    # Check if today's insight already exists
    existing_insight = (
        db.query(DailyInsight)
        .filter(
            DailyInsight.user_id == user_id,
            DailyInsight.date == today
        )
        .first()
    )
    
    if existing_insight:
        return {
            "insight": existing_insight.insight,
            "cached": True
        }
    # Fetch user's journal entries (latest first)
    all_entries = (
        db.query(Journal)
        .filter(Journal.user_id == user_id)
        .order_by(Journal.id.desc())
        .all()
    )
      # Use last 30 entries for pattern detection
    entries_to_use = [entry.content for entry in all_entries[:5]]

    if not entries_to_use:
        return {"insight": None}

    # Generate new insight
    insight_text = await generate_insight(entries_to_use)
    # Save one insight for today
    new_insight = DailyInsight(
        user_id=user_id,
        date=today,
        insight=insight_text
    )

    db.add(new_insight)
    db.commit()
    db.refresh(new_insight)

    return {
        "insight": insight_text,
        "cached": False
    }
    

#put: new data, server decides new ID
#post: updating data at existing ID
# for new entry it will check data type, and stores in journal(db table) using ID of that user and return it 
@router.post("/")
def create_journal(
    request: JournalRequest,
    db: Session =Depends(get_db),
    user=Depends(get_current_user)
):
    new_entry=Journal(
        content=request.content, 
        user_id=user["id"]
    )

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    vec = embed_text(new_entry.content)
    db.add(EntryEmbedding(
        user_id    = user["id"],
        entry_id   = new_entry.id,
        entry_type = "journal",
        content    = new_entry.content,
        embedding  = vec,
    ))
    db.commit()
    return new_entry

#fetching entries from journal of logged in user by matching ID
@router.get("/")
def get_journals(
    db: Session=Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(Journal).filter(Journal.user_id==user["id"]).all()


#feature 2 endpoint
@router.get("/insights-dashboard")
async def get_insights_dashboard(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = user["id"]
    today = date.today()

    # ── Cache check ──────────────────────────────────────────────────────────
    existing = (
        db.query(DailyInsightsDashboard)
        .filter(
            DailyInsightsDashboard.user_id == user_id,
            DailyInsightsDashboard.date == today,
        )
        .first()
    )
    if existing:
        return {"data": json.loads(existing.data), "cached": True}

    # ── Fetch entries ─────────────────────────────────────────────────────────
    all_entries = (
        db.query(Journal)
        .filter(Journal.user_id == user_id)
        .order_by(Journal.id.desc())
        .all()
    )
    entries_to_use = [e.content for e in all_entries[:20]]  # up to 20 entries

    if not entries_to_use:
        return {"data": None}

    # ── Call Groq ─────────────────────────────────────────────────────────────
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        return {"data": None, "error": "GROQ_API_KEY not set"}

    entries_text = "\n\n".join([f"Entry {i+1}: {e}" for i, e in enumerate(entries_to_use)])

    system_prompt = """You are a thoughtful journaling analyst. Analyze the journal entries and return ONLY a valid JSON object — no markdown, no explanation, no backticks.

Return this exact shape:
{
  "gratitude_wins": ["short win or gratitude item", "another one"],
  "top_topics": ["topic 1", "topic 2", "topic 3"],
  "recurring_thought": "one short sentence capturing what keeps coming up",
  "reflection": "2-3 sentences of warm, honest reflection on patterns you notice"
}

Rules:
- gratitude_wins: 1–3 items. Pick moments of gratitude, celebration, or progress — big or small. If nothing is clearly present return [].
- top_topics: 2–3 topics the person writes about most. Use simple labels like "work", "family", "health", "anxiety", "goals". If only 1–2 topics are visible, return those.
- recurring_thought: 1 sentence max. The idea, worry, or theme that keeps appearing. If nothing recurs clearly return null.
- reflection: 2–3 sentences. Warm, personal, and grounded in what's actually written — not generic. If there's truly not enough to reflect on return null.
- Never say "journal entries" or "the writer". Write as if speaking directly to the person.
- Generate insight even from short entries — do your best with what is there.
- Return ONLY the JSON. No extra text."""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here are my journal entries:\n\n{entries_text}"},
        ],
        "max_tokens": 400,
        "temperature": 0.55,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=20.0,
        )
        result = response.json()

    raw_text = result["choices"][0]["message"]["content"].strip()

    # ── Parse JSON safely ─────────────────────────────────────────────────────
    try:
        # Strip markdown fences if the model slips them in
        clean = raw_text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
    except json.JSONDecodeError:
        return {"data": None, "error": "Could not parse AI response"}

    # ── Cache it ──────────────────────────────────────────────────────────────
    new_record = DailyInsightsDashboard(
        user_id=user_id,
        date=today,
        data=json.dumps(parsed),
    )
    db.add(new_record)
    try:
        db.commit()
        db.refresh(new_record)
    except Exception:
        db.rollback()  # already cached by a concurrent request — fine

    return {"data": parsed, "cached": False}

def embed_text(text: str) -> list[float]:
    """Generate a 384-dim embedding vector for a piece of text."""
    return embedding_model.encode(text, normalize_embeddings=True).tolist()

def retrieve_relevant_chunks(
    query: str,
    user_id: int,
    db: Session,
    top_k: int = 6
) -> list[str]:
    """
    Embed the query, then cosine-similarity search all embeddings
    belonging to this user. Returns the top_k most relevant text chunks.
    """
    query_vec = np.array(embed_text(query)).reshape(1, -1)
 
    all_embeddings = (
        db.query(EntryEmbedding)
        .filter(EntryEmbedding.user_id == user_id)
        .all()
    )
 
    if not all_embeddings:
        return []
 
    # Build matrix of all stored vectors
    vectors  = np.array([e.embedding for e in all_embeddings])
    scores   = cosine_similarity(query_vec, vectors)[0]
    top_idxs = scores.argsort()[::-1][:top_k]
 
    return [all_embeddings[i].content for i in top_idxs if scores[i] > 0.2]

def chunk_text(text: str, chunk_size: int = 300) -> list[str]:
    """
    Split a long text into overlapping chunks of ~chunk_size words.
    Overlap helps preserve context at chunk boundaries.
    """
    words  = text.split()
    chunks = []
    step   = chunk_size - 50  # 50-word overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk.strip())
    return chunks

#for file parsing
def parse_txt(content: bytes) -> str:
    return content.decode("utf-8", errors="ignore")
 
 
def parse_md(content: bytes) -> str:
    text = content.decode("utf-8", errors="ignore")
    # Strip markdown syntax — headings, bold, italic, links, code blocks
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*",   r"\1", text)
    text = re.sub(r"`{1,3}.*?`{1,3}", "", text, flags=re.DOTALL)
    text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)
    return text.strip()
 
 
def parse_docx(content: bytes) -> str:
    import io
    doc  =  DocxDocument(io.BytesIO(content))
    return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
 
 
def parse_file(filename: str, content: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "docx":
        return parse_docx(content)
    elif ext == "md":
        return parse_md(content)
    else:
        return parse_txt(content)   # .txt, .html from Apple Notes, etc.
    
#endpoint to embedding existing journal entries
@router.post("/embed-journals")
async def embed_existing_journals(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Embeds all of this user's existing journal entries.
    Call once after setting up the feature; new entries are auto-embedded on save.
    """
    user_id = user["id"]
 
    journals = db.query(Journal).filter(Journal.user_id == user_id).all()
    embedded = 0
 
    for journal in journals:
        # Skip if already embedded
        exists = db.query(EntryEmbedding).filter(
            EntryEmbedding.entry_id   == journal.id,
            EntryEmbedding.entry_type == "journal",
            EntryEmbedding.user_id    == user_id,
        ).first()
        if exists:
            continue
 
        vec = embed_text(journal.content)
        db.add(EntryEmbedding(
            user_id    = user_id,
            entry_id   = journal.id,
            entry_type = "journal",
            content    = journal.content,
            embedding  = vec,
        ))
        embedded += 1
 
    db.commit()
    return {"embedded": embedded, "total": len(journals)}

#endpoint: for file import
@router.post("/import")
async def import_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id  = user["id"]
    content  = await file.read()
    filename = file.filename or "upload"
    ext      = filename.rsplit(".", 1)[-1].lower()
 
    if ext not in ("txt", "md", "docx"):
        return {"error": "Unsupported file type. Use .txt, .md, or .docx"}
 
    # Parse the file into plain text
    text = parse_file(filename, content)
    if not text.strip():
        return {"error": "File appears to be empty"}
 
    # Split into chunks and embed each one
    chunks        = chunk_text(text, chunk_size=300)
    saved_chunks  = 0

    for chunk in chunks:
        # Save as imported entry
        imported = ImportedEntry(
            user_id     = user_id,
            source_name = filename,
            source_type = ext,
            content     = chunk,
        )
        db.add(imported)
        db.flush()
 
        # Also save as a journal entry so it appears in entries list
        journal_entry = Journal(
            content = f"[Imported from {filename}]\n\n{chunk}",
            user_id = user_id,
        )
        db.add(journal_entry)
        db.flush()
 
        # Embed the chunk (linked to the journal entry for RAG)
        vec = embed_text(chunk)
        db.add(EntryEmbedding(
            user_id    = user_id,
            entry_id   = journal_entry.id,
            entry_type = "journal",
            content    = chunk,
            embedding  = vec,
        ))
        saved_chunks += 1
 
    db.commit()
 
    
    return {
        "message":  f"Imported {saved_chunks} chunks from {filename}",
        "chunks":   saved_chunks,
        "filename": filename,
    }
 
#endpoint: to chat with past self
class ChatRequest(BaseModel):
    message:    str
    session_id: int | None = None   # None = start a new session
 
 
@router.post("/chat")
async def chat_with_past_self(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = user["id"]
 
    # ── Get or create session ─────────────────────────────────────────────────
    if request.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id      == request.session_id,
            ChatSession.user_id == user_id,
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        # Auto-title from first message (truncated)
        title   = request.message[:60] + ("..." if len(request.message) > 60 else "")
        session = ChatSession(user_id=user_id, title=title)
        db.add(session)
        db.commit()
        db.refresh(session)
 
    # ── RAG: retrieve relevant chunks ─────────────────────────────────────────
    relevant_chunks = retrieve_relevant_chunks(request.message, user_id, db, top_k=6)
 
    if not relevant_chunks:
        return {
            "reply":      "I don't have enough of your memories to answer that yet. Try importing some notes or writing more journal entries.",
            "session_id": session.id,
        }
 
    context = "\n\n---\n\n".join(relevant_chunks)
 
    # ── Build conversation history ────────────────────────────────────────────
    past_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.id.asc())
        .all()
    )
 
    history = [{"role": m.role, "content": m.content} for m in past_messages]
 
    system_prompt = f"""You are the past version of the person now talking to you. These are your memories:
 
{context}
 
Rules:
- Speak in first person as their past self.
- Keep every reply to 2-3 sentences maximum. Be concise and direct.
- Use the tone and concerns visible in the memories.
- If asked about something not in your memories, say you don't remember in one sentence.
- Never say "journal entries", "notes", or "as an AI". You are their past self.
- Never break character.
"""
 
    messages = [{"role": "user", "content": system_prompt}]  # inject as first user turn (Groq trick for system-like behavior)
    messages += history
    messages.append({"role": "user", "content": request.message})
 
    # ── Call Groq ─────────────────────────────────────────────────────────────
    groq_api_key = os.getenv("GROQ_API_KEY")
    payload = {
        "model":       "llama-3.3-70b-versatile",
        "messages":    messages,
        "max_tokens":  120,
        "temperature": 0.7,
        "stream":      True,   # ← streaming on
    }
 
    async def stream_response():
        full_reply = ""
 
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type":  "application/json",
                },
                json=payload,
                timeout=30.0,
            ) as response:
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[6:]  # strip "data: "
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"].get("content", "")
                        if delta:
                            full_reply += delta
                            yield delta
                    except Exception:
                        continue
 
        # Save to DB after streaming completes
        if full_reply:
            db.add(ChatMessage(session_id=session.id, role="user",      content=request.message))
            db.add(ChatMessage(session_id=session.id, role="assistant", content=full_reply))
            db.commit()
 
        # Send session_id as final metadata chunk
        yield f"\\n[SESSION_ID:{session.id}]"
 
    return StreamingResponse(stream_response(), media_type="text/plain")
#endpoint: list chat sessions
@router.get("/chat/sessions")
def get_chat_sessions(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user["id"])
        .order_by(ChatSession.id.desc())
        .all()
    )
    return [{"id": s.id, "title": s.title, "created_at": s.created_at} for s in sessions]
 
 
# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 5 — GET SESSION MESSAGES
# ─────────────────────────────────────────────────────────────────────────────
 
@router.get("/chat/sessions/{session_id}")
def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user["id"],
    ).first()
 
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
 
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.asc())
        .all()
    )
 
    return {
        "session": {"id": session.id, "title": session.title},
        "messages": [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in messages],
    }

#to delete any chat
@router.delete("/chat/sessions/{session_id}")
def delete_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user["id"],
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete messages first (foreign key dependency)
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()

    return {"message": "deleted"}

#to get single journal ID
@router.get("/{journal_id}")
def get_journal(
    journal_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    journal=db.query(Journal).filter(
        Journal.id == journal_id,
        Journal.user_id == user['id']
    ).first()

    if not journal:
        raise HTTPException(status_code=404, detail="Not found")

#updating the existing entry 
@router.put("/{journal_id}", response_model=JournalRequest)
def update_journal(
    journal_id: int, 
    request: JournalRequest,
    db: Session=Depends(get_db),
    user=Depends(get_current_user)
):
    journal=db.query(Journal).filter(
        Journal.id == journal_id,
        Journal.user_id==user["id"]
    ).first()

    if not journal:
        raise HTTPException(status_code=404, detail="not found")
    
    journal.content=request.content #pydantic model and content is its defined field 
    db.commit()
    db.refresh(journal)
    return journal

#delete endpoint
@router.delete("/{journal_id}")
def delete_journal(
    journal_id: int, 
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    journal=db.query(Journal).filter(
        Journal.id==journal_id,
        Journal.user_id == user["id"]
    ).first()

    if not journal:
        raise HTTPException(status_code=404, detail='Not Found')
    
    db.delete(journal)
    db.commit()
    return {'message': 'deleted'}

