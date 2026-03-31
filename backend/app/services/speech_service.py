from fastapi import UploadFile

from app.core.config import get_settings

settings = get_settings()


class SpeechService:
    async def transcribe(self, file: UploadFile, language: str, openai_api_key: str = "") -> tuple[str, str]:
        if openai_api_key or settings.openai_api_key:
            # Hook for a Whisper-compatible API integration.
            return (
                f"Transcription for {file.filename or 'recording'} is ready. Replace this stub with a live Whisper call.",
                "openai-whisper-stub",
            )

        return (
            "Demo transcript: I understand the concept, but I want a simpler explanation with an everyday example.",
            "demo-fallback",
        )


speech_service = SpeechService()
