from sqlalchemy import UniqueConstraint, Column, Integer, String, ForeignKey, String, Date, Text, DateTime, JSON
from database import Base
from datetime import date
from sqlalchemy.sql import func


#user table to store id, name and password
class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)

#journal table to save journal text and entry of user

class Journal(Base):
    __tablename__="journals"

    id=Column(Integer, primary_key=True, index=True)
    content=Column(String)
    user_id=Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())

#table that will save insight per day
class DailyInsight(Base):          # use the same Base your other models use
    __tablename__ = "daily_insights"
 
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    date       = Column(Date,    nullable=False)   # one row per user per day
    insight    = Column(Text,    nullable=False)
 
    # Make (user_id, date) unique so we never get duplicate rows
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_user_date"),
    )

#feature 2: daily insight dashboard
class DailyInsightsDashboard(Base):
    __tablename__ = "daily_insights_dashboard"
 
    id      = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date    = Column(Date,    nullable=False)
    data    = Column(Text,    nullable=False)  # stores the JSON blob
 
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_dashboard_user_date"),
    )
 
 #table to store uploaded text and extension
class ImportedEntry(Base):
    """Stores parsed text chunks from uploaded files (txt, md, docx, notes)."""
    __tablename__ = "imported_entries"
 
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    source_name = Column(String, nullable=False)   # original filename
    source_type = Column(String, nullable=False)   # "txt" | "md" | "docx"
    content     = Column(Text,   nullable=False)   # the chunk text
    created_at  = Column(DateTime, server_default=func.now())

class EntryEmbedding(Base):
    """
    Stores sentence-transformer embeddings for both journal entries
    and imported entries. entry_type tells us which table the source is from.
    """
    __tablename__ = "entry_embeddings"
 
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    entry_id    = Column(Integer, nullable=False)   # FK to journals.id OR imported_entries.id
    entry_type  = Column(String,  nullable=False)   # "journal" | "imported"
    content     = Column(Text,    nullable=False)   # the original text (for retrieval)
    embedding   = Column(JSON,    nullable=False)   # list of floats stored as JSON

class ChatSession(Base):
    """One chat session = one continuous conversation with past self."""
    __tablename__ = "chat_sessions"
 
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    title      = Column(String,  nullable=True)     # auto-generated from first message
    created_at = Column(DateTime, server_default=func.now())
 
class ChatMessage(Base):
    """Individual messages within a chat session."""
    __tablename__ = "chat_messages"
 
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role       = Column(String,  nullable=False)    # "user" | "assistant"
    content    = Column(Text,    nullable=False)
    created_at = Column(DateTime, server_default=func.now())