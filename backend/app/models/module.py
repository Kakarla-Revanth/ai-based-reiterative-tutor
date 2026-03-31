from typing import Any

from sqlalchemy import ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LearningModule(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    topic: Mapped[str] = mapped_column(String(255), index=True)
    title: Mapped[str] = mapped_column(String(255))
    language: Mapped[str] = mapped_column(String(80))
    learning_style: Mapped[str] = mapped_column(String(80))
    module_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    questions: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    narration_text: Mapped[str] = mapped_column(String, default="")
    xp_reward: Mapped[int] = mapped_column(Integer, default=40)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    user = relationship("User", back_populates="modules")
    progress_records = relationship("ProgressRecord", back_populates="module", cascade="all, delete-orphan")

