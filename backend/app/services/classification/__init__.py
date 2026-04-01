from app.config import get_settings
from app.services.classification.llm_classifier import LLMClassifier


def get_classifier() -> LLMClassifier:
    """Return an LLMClassifier initialised with the configured API key and model."""
    settings = get_settings()
    return LLMClassifier(api_key=settings.OPENAI_API_KEY, model=settings.CLASSIFICATION_MODEL)
