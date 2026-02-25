"""
Сервис поиска по базе знаний ЭРИС.
Использует простой TF-IDF подход для MVP.
В продакшене можно заменить на pgvector/embeddings.
"""
import re
from typing import List, Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session


@dataclass
class KBSearchResult:
    """Результат поиска в базе знаний"""
    id: int
    title: str
    content: str
    score: float
    snippet: str  # Короткий фрагмент с совпадением


class KBSearchService:
    """Сервис поиска релевантных статей из базы знаний."""

    # Ключевые слова для кейса ЭРИС и их веса
    KEYWORD_WEIGHTS = {
        # Типы запросов
        "калибровка": 2.0,
        "поверка": 2.0,
        "ошибка": 1.5,
        "неисправность": 1.5,
        "датчик": 1.5,
        "замена": 1.5,
        "гарантия": 1.5,
        "ремонт": 1.5,
        "документ": 1.5,
        "паспорт": 1.5,
        "сертификат": 1.5,
        "руководство": 1.5,

        # Модели приборов
        "эрис-210": 2.0,
        "эрис-230": 2.0,
        "эрис-310": 2.0,
        "дгс-эрис": 2.0,
        "газоанализатор": 1.5,
        "газосигнализатор": 1.5,

        # Технические термины
        "пгс": 1.5,  # поверочная газовая смесь
        "4-20ма": 1.5,
        "rs-485": 1.5,
        "modbus": 1.5,
        "сенсор": 1.5,
        "чувствительный": 1.5,

        # Ошибки
        "e01": 2.0,
        "e02": 2.0,
        "e03": 2.0,
        "e04": 2.0,
        "e05": 2.0,
    }

    def __init__(self, db: Session):
        self.db = db

    def search(self, query: str, top_k: int = 3) -> List[KBSearchResult]:
        """
        Поиск релевантных статей по запросу.

        Args:
            query: Текст запроса (тема + тело письма)
            top_k: Количество возвращаемых результатов

        Returns:
            Список KBSearchResult отсортированный по релевантности
        """
        from app.models import KbArticle

        # Получаем все статьи
        articles = self.db.query(KbArticle).filter(
            KbArticle.content.isnot(None)
        ).all()

        if not articles:
            return []

        # Нормализуем запрос
        query_lower = query.lower()
        query_tokens = self._tokenize(query_lower)

        # Считаем релевантность каждой статьи
        scored_articles = []
        for article in articles:
            score = self._calculate_score(
                query_lower,
                query_tokens,
                article.title or "",
                article.content or "",
                article.tags or ""
            )
            if score > 0:
                snippet = self._extract_snippet(article.content or "", query_tokens)
                scored_articles.append(KBSearchResult(
                    id=article.id,
                    title=article.title,
                    content=article.content,
                    score=score,
                    snippet=snippet
                ))

        # Сортируем по релевантности
        scored_articles.sort(key=lambda x: x.score, reverse=True)

        return scored_articles[:top_k]

    def get_context_for_llm(self, query: str, top_k: int = 3) -> str:
        """
        Формирует контекст для LLM из найденных статей.

        Args:
            query: Текст запроса
            top_k: Количество статей

        Returns:
            Форматированный текст для вставки в промпт
        """
        results = self.search(query, top_k)

        if not results:
            return ""

        context_parts = []
        for i, result in enumerate(results, 1):
            # Ограничиваем длину контента
            content = result.content
            if len(content) > 800:
                content = content[:800] + "..."

            context_parts.append(f"### Статья {i}: {result.title}\n{content}")

        return "\n\n".join(context_parts)

    def _tokenize(self, text: str) -> set:
        """Разбивает текст на токены (слова)."""
        # Убираем знаки препинания и разбиваем на слова
        words = re.findall(r'[а-яёa-z0-9\-]+', text.lower())
        # Фильтруем короткие слова
        return {w for w in words if len(w) >= 3}

    def _calculate_score(
        self,
        query_lower: str,
        query_tokens: set,
        title: str,
        content: str,
        tags: str
    ) -> float:
        """
        Вычисляет релевантность статьи запросу.

        Используем простую схему весов:
        - Точное совпадение ключевых слов ЭРИС: высокий вес
        - Совпадение токенов в заголовке: средний вес
        - Совпадение токенов в контенте: базовый вес
        - Совпадение в тегах: дополнительный вес
        """
        score = 0.0

        title_lower = title.lower()
        content_lower = content.lower()
        tags_lower = tags.lower()

        # 1. Проверяем ключевые слова ЭРИС
        for keyword, weight in self.KEYWORD_WEIGHTS.items():
            if keyword in query_lower:
                # Ключевое слово есть в запросе
                if keyword in title_lower:
                    score += weight * 3  # В заголовке — максимум
                if keyword in content_lower:
                    score += weight * 1  # В контенте
                if keyword in tags_lower:
                    score += weight * 2  # В тегах

        # 2. Проверяем совпадение токенов
        title_tokens = self._tokenize(title_lower)
        content_tokens = self._tokenize(content_lower)

        # Совпадения в заголовке
        title_matches = query_tokens & title_tokens
        score += len(title_matches) * 2.0

        # Совпадения в контенте
        content_matches = query_tokens & content_tokens
        score += len(content_matches) * 0.5

        return score

    def _extract_snippet(self, content: str, query_tokens: set, max_length: int = 200) -> str:
        """
        Извлекает короткий фрагмент контента с совпадениями.
        """
        content_lower = content.lower()

        # Ищем первое вхождение любого токена
        best_pos = len(content)
        for token in query_tokens:
            pos = content_lower.find(token)
            if pos != -1 and pos < best_pos:
                best_pos = pos

        # Если не нашли — берём начало
        if best_pos == len(content):
            return content[:max_length] + ("..." if len(content) > max_length else "")

        # Берём контекст вокруг найденного слова
        start = max(0, best_pos - 50)
        end = min(len(content), best_pos + max_length - 50)

        snippet = content[start:end]

        # Добавляем многоточия
        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."

        return snippet


def search_kb(db: Session, query: str, top_k: int = 3) -> List[KBSearchResult]:
    """Удобная функция для поиска."""
    service = KBSearchService(db)
    return service.search(query, top_k)


def get_kb_context(db: Session, query: str, top_k: int = 3) -> str:
    """Удобная функция для получения контекста LLM."""
    service = KBSearchService(db)
    return service.get_context_for_llm(query, top_k)
