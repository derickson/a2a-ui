import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


def _utcnow():
    return datetime.now(timezone.utc)


def _new_id():
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class KibanaServer(Base):
    __tablename__ = "kibana_servers"

    id = Column(String, primary_key=True, default=_new_id)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    api_key = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, default=_new_id)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False, unique=True)
    description = Column(Text, default="")
    card_json = Column(Text, default="{}")
    headers_json = Column(Text, default="{}")
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    conversations = relationship("Conversation", back_populates="agent", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=_new_id)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    title = Column(String, default="New Conversation")
    context_id = Column(String, default=_new_id)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    agent = relationship("Agent", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=_new_id)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" or "agent"
    content = Column(Text, nullable=False)
    task_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    conversation = relationship("Conversation", back_populates="messages")
