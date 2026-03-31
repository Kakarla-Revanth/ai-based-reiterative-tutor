from __future__ import annotations

import json
import re
from difflib import SequenceMatcher

import httpx

from app.core.config import get_settings
from app.schemas.tutor import GenerateModulesRequest, ModuleSchema, QuestionSchema, SlideSchema
from app.services.translation_service import translation_service

settings = get_settings()


class AIService:
    async def generate_modules(
        self, payload: GenerateModulesRequest, provider_keys: dict[str, str] | None = None
    ) -> list[ModuleSchema]:
        provider_keys = provider_keys or {}
        gemini_api_key = provider_keys.get("gemini_api_key") or settings.gemini_api_key
        openai_api_key = provider_keys.get("openai_api_key") or settings.openai_api_key

        if gemini_api_key:
            generated = await self._generate_with_gemini(payload, gemini_api_key)
            if generated:
                return generated

        if openai_api_key:
            generated = await self._generate_with_openai(payload, openai_api_key, gemini_api_key=gemini_api_key)
            if generated:
                return generated

        return self._generate_fallback_modules(payload)

    async def _generate_with_gemini(self, payload: GenerateModulesRequest, gemini_api_key: str) -> list[ModuleSchema]:
        prompt = f"""
        You are building a learning path for an adaptive AI tutor.
        Topic: {payload.topic}
        Learning style: {payload.learning_style}

        Return valid JSON with a top-level key "modules".
        Create exactly 5 modules and make each module contain:
        - title
        - module_index
        - slides: exactly 3 items, each with title, body (3 short bullet points), speaker_note
        - questions: exactly 2 items, each with prompt, expected_answer, concept, difficulty
        - narration_text
        - xp_reward

        Keep the source content in English.
        Keep the module titles simple and beginner-friendly.
        The learning path should progress from foundation -> understanding -> application -> review -> mastery.
        """

        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                    params={"key": gemini_api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.35},
                    },
                )
                response.raise_for_status()
                raw_text = self._extract_gemini_text(response.json())
        except Exception:
            return []

        parsed = self._extract_json_object(raw_text)
        return await self._modules_from_payload(parsed, payload, gemini_api_key=gemini_api_key)

    async def _generate_with_openai(self, payload: GenerateModulesRequest, openai_api_key: str, gemini_api_key: str = "") -> list[ModuleSchema]:
        prompt = f"""
        Create 5 teaching modules as JSON for the topic "{payload.topic}".
        Each module must include:
        - title
        - module_index
        - 3 slides with title, body (3 bullet points), and speaker_note
        - 2 questions with prompt, expected_answer, concept, difficulty
        - narration_text
        - xp_reward

        Learning style: {payload.learning_style}
        Output JSON with a top-level key named modules.
        Keep English as the source language.
        """

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.openai_model,
                        "response_format": {"type": "json_object"},
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert tutor who creates structured educational modules.",
                            },
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                response.raise_for_status()
                data = response.json()
                raw_text = data["choices"][0]["message"]["content"]
        except Exception:
            return []

        parsed = self._extract_json_object(raw_text)
        return await self._modules_from_payload(parsed, payload, gemini_api_key=gemini_api_key)

    def _generate_fallback_modules(self, payload: GenerateModulesRequest) -> list[ModuleSchema]:
        style_hint = {
            "Normal": "clear and structured",
            "Storytelling": "narrative and example-driven",
            "Creative": "inventive and curiosity-building",
            "Explain like a 5-year-old": "simple, warm, and concrete",
        }[payload.learning_style]

        module_titles = [
            f"{payload.topic}: Foundation",
            f"{payload.topic}: Core Idea",
            f"{payload.topic}: How It Works",
            f"{payload.topic}: Real-World Use",
            f"{payload.topic}: Review",
        ]

        modules: list[ModuleSchema] = []
        for index, title in enumerate(module_titles, start=1):
            slide_bodies = [
                [
                    f"Learn the main idea of {payload.topic} in a {style_hint} way.",
                    f"Connect {payload.topic} to daily life, interests, and learner-friendly examples.",
                    "Build one small mental model before moving to deeper details.",
                ],
                [
                    f"Break {payload.topic} into smaller parts so the learner can recall each one.",
                    "Contrast correct understanding with one common misconception.",
                    "Use a simple analogy to anchor the explanation.",
                ],
                [
                    "Apply the idea in one small situation, example, or comparison.",
                    "Ask the learner to explain what changes and what stays the same.",
                    "Use one worked example before the checkpoint question.",
                ],
            ]
            slides = [
                SlideSchema(
                    title=f"Slide {slide_index}: {title}",
                    body=translation_service.translate_lines(body, payload.language),
                    speaker_note=f"This explanation is designed to feel {style_hint} for the learner.",
                )
                for slide_index, body in enumerate(slide_bodies, start=1)
            ]
            questions = [
                QuestionSchema(
                    prompt=f"In your own words, what is the most important idea from {title}?",
                    expected_answer=f"The learner should explain the main idea of {payload.topic} from module {index}.",
                    concept=f"{payload.topic} module {index} summary",
                    difficulty="easy" if index <= 2 else "medium",
                ),
                QuestionSchema(
                    prompt=f"Give one simple example that shows {title.lower()}.",
                    expected_answer=f"The learner should give one valid example connected to {payload.topic} in module {index}.",
                    concept=f"{payload.topic} module {index} example",
                    difficulty="medium",
                ),
            ]
            narration = (
                f"Welcome to module {index} on {payload.topic}. "
                f"We'll cover this topic in a {style_hint} way and pause to check understanding."
            )
            modules.append(
                ModuleSchema(
                    title=title,
                    topic=payload.topic,
                    language=payload.language,
                    learning_style=payload.learning_style,
                    module_index=index,
                    slides=slides,
                    narration_text=narration,
                    questions=questions,
                    xp_reward=35 + index * 10,
                )
            )

        return modules

    async def evaluate_answer(
        self,
        expected_answer: str,
        user_answer: str,
        concept: str,
        provider_keys: dict[str, str] | None = None,
    ) -> dict:
        provider_keys = provider_keys or {}
        gemini_api_key = provider_keys.get("gemini_api_key") or settings.gemini_api_key

        if gemini_api_key:
            evaluated = await self._evaluate_with_gemini(expected_answer, user_answer, concept, gemini_api_key)
            if evaluated:
                return evaluated

        return self._evaluate_fallback(expected_answer, user_answer, concept)

    async def _evaluate_with_gemini(
        self, expected_answer: str, user_answer: str, concept: str, gemini_api_key: str
    ) -> dict:
        prompt = f"""
        Evaluate a learner answer for an adaptive tutor.
        Concept: {concept}
        Expected answer: {expected_answer}
        User answer: {user_answer}

        Return valid JSON with:
        - correct: boolean
        - confidence: number between 0 and 1
        - explanation: short string
        - next_action: short string
        - reteach_text: short reteach explanation
        - recommended_difficulty: easy, medium, or hard
        - xp_awarded: integer
        """

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                    params={"key": gemini_api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json"},
                    },
                )
                response.raise_for_status()
                raw_text = self._extract_gemini_text(response.json())
        except Exception:
            return {}

        parsed = self._extract_json_object(raw_text)
        if not parsed:
            return {}

        try:
            confidence = float(parsed.get("confidence", 0.5))
            xp_awarded = int(parsed.get("xp_awarded", 10))
            recommended_difficulty = str(parsed.get("recommended_difficulty", "medium")).lower()
            if recommended_difficulty not in {"easy", "medium", "hard"}:
                recommended_difficulty = "medium"
            return {
                "correct": bool(parsed.get("correct", False)),
                "confidence": max(0.0, min(0.99, confidence)),
                "explanation": str(parsed.get("explanation", "Here is your feedback.")),
                "next_action": str(parsed.get("next_action", "Continue learning.")),
                "reteach_text": str(parsed.get("reteach_text", f"Let's revisit {concept} one more time.")),
                "recommended_difficulty": recommended_difficulty,
                "xp_awarded": max(0, xp_awarded),
            }
        except Exception:
            return {}

    def _evaluate_fallback(self, expected_answer: str, user_answer: str, concept: str) -> dict:
        similarity = SequenceMatcher(None, expected_answer.lower(), user_answer.lower()).ratio()
        keyword_hits = sum(1 for word in concept.lower().split() if word in user_answer.lower())
        confidence = min(0.99, round((similarity * 0.6) + min(keyword_hits * 0.12, 0.35), 2))
        correct = confidence >= 0.55 or len(user_answer.split()) > 10

        if correct:
            return {
                "correct": True,
                "confidence": confidence,
                "explanation": "Strong effort. Your answer shows useful understanding of the concept.",
                "next_action": "Move to the next module or try a harder follow-up.",
                "reteach_text": f"Quick reinforcement: {concept} works best when you explain it with one simple example.",
                "recommended_difficulty": "medium" if confidence < 0.8 else "hard",
                "xp_awarded": 25 if confidence >= 0.8 else 15,
            }

        return {
            "correct": False,
            "confidence": confidence,
            "explanation": "You are close, but the answer needs a clearer core idea or example.",
            "next_action": "Review the weak area and answer again after the reteach summary.",
            "reteach_text": (
                f"Reteach: think of {concept} as a simple idea you can explain to a friend in one sentence, "
                "then attach one everyday example."
            ),
            "recommended_difficulty": "easy",
            "xp_awarded": 5,
        }

    def _extract_gemini_text(self, payload: dict) -> str:
        candidates = payload.get("candidates", [])
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return ""
        return str(parts[0].get("text", ""))

    def _extract_json_object(self, raw_text: str) -> dict:
        if not raw_text:
            return {}

        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```json\s*|^```\s*|```$", "", cleaned, flags=re.MULTILINE).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if not match:
                return {}
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}

    async def _modules_from_payload(
        self,
        parsed: dict,
        payload: GenerateModulesRequest,
        gemini_api_key: str = "",
    ) -> list[ModuleSchema]:
        modules = []
        for item in parsed.get("modules", []):
            try:
                translated_item = await translation_service.translate_module_item(
                    item,
                    payload.language,
                    gemini_api_key=gemini_api_key,
                )
                slides = [
                    SlideSchema(
                        title=slide["title"],
                        body=list(slide["body"]),
                        speaker_note=slide["speaker_note"],
                    )
                    for slide in translated_item["slides"]
                ]
                questions = [QuestionSchema(**question) for question in translated_item["questions"]]
                modules.append(
                    ModuleSchema(
                        title=translated_item["title"],
                        topic=payload.topic,
                        language=payload.language,
                        learning_style=payload.learning_style,
                        module_index=translated_item["module_index"],
                        slides=slides,
                        narration_text=translated_item["narration_text"],
                        questions=questions,
                        xp_reward=translated_item.get("xp_reward", 40),
                    )
                )
            except Exception:
                continue
        return modules

    async def translate_ui_entries(
        self, language: str, entries: dict[str, str], provider_keys: dict[str, str] | None = None
    ) -> dict[str, str]:
        if language.lower() == "english":
            return entries

        provider_keys = provider_keys or {}
        gemini_api_key = provider_keys.get("gemini_api_key") or settings.gemini_api_key
        if not gemini_api_key:
            return entries

        prompt = (
            "Translate the values of this JSON object into the requested language. "
            "Keep the same keys, preserve placeholders like {name} or {count}, "
            "and return valid JSON only. Use natural wording in the target language and its standard script.\n"
            f"Target language: {language}\n"
            f"JSON: {json.dumps(entries, ensure_ascii=False)}"
        )

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                    params={"key": gemini_api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
                    },
                )
                response.raise_for_status()
                raw_text = self._extract_gemini_text(response.json())
                parsed = self._extract_json_object(raw_text)
        except Exception:
            return entries

        return {
            key: str(parsed.get(key, value))
            for key, value in entries.items()
        }

    async def ask_coach(
        self,
        language: str,
        module_title: str,
        slide_title: str,
        slide_body: list[str],
        question: str,
        provider_keys: dict[str, str] | None = None,
    ) -> str:
        provider_keys = provider_keys or {}
        gemini_api_key = provider_keys.get("gemini_api_key") or settings.gemini_api_key
        if not gemini_api_key:
            return self._ask_coach_fallback(language, slide_body, question)

        prompt = f"""
        You are a warm AI tutor coach.
        Reply in {language} using the standard script of that language.
        Keep the answer concise, learner-friendly, and focused on the current slide only.
        Use 2 short paragraphs maximum.

        Module title: {module_title}
        Slide title: {slide_title}
        Slide points:
        - {slide_body[0]}
        - {slide_body[1] if len(slide_body) > 1 else ""}
        - {slide_body[2] if len(slide_body) > 2 else ""}

        Learner question: {question}
        """

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                    params={"key": gemini_api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.35},
                    },
                )
                response.raise_for_status()
                raw_text = self._extract_gemini_text(response.json()).strip()
        except Exception:
            return self._ask_coach_fallback(language, slide_body, question)

        return raw_text or self._ask_coach_fallback(language, slide_body, question)

    def _ask_coach_fallback(self, language: str, slide_body: list[str], question: str) -> str:
        if language.lower() == "hindi":
            return (
                f"इस स्लाइड का मुख्य विचार यह है: {slide_body[0]} "
                f"आपके सवाल '{question}' के लिए पहले इस मुख्य बिंदु को समझिए, फिर इसे एक आसान उदाहरण से जोड़िए।"
            )

        if language.lower() != "english":
            return (
                f"Main idea: {slide_body[0]} "
                "A Gemini key will give a better coach reply in your selected language."
            )

        return (
            f"Main idea: {slide_body[0]} "
            f"For your question '{question}', start from that core idea and connect it to one simple example."
        )


ai_service = AIService()
