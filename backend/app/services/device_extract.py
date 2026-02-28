"""
Извлечение модели прибора (Прибор) из текста тикета: regex + нормализация.
Используется при создании тикета и в AI pipeline; AI не должна придумывать модель — только из текста.
"""
import re
from typing import Optional

# Известные модели ЭРИС (приоритет)
KNOWN_DEVICES = [
    r"ЭРИС[- ]?210",
    r"ЭРИС[- ]?230",
    r"ЭРИС[- ]?310",
    r"ЭРИС[- ]?ФИД",
    r"ERIS[- ]?210",
    r"ERIS[- ]?230",
    r"ERIS[- ]?310",
    r"ГСМ[- ]?05",
    r"ГСМ[- ]?10",
    r"ГС[- ]?СО",
    r"ДГС[- ]?ЭРИС",
]

# Общий паттерн: буквы (2–10) + опционально -/пробел + цифры (2–4)
GENERAL_PATTERN = re.compile(
    r"\b([А-ЯA-Z][А-ЯA-Z0-9\-]{1,9}[- ]?\d{2,4})\b",
    re.IGNORECASE,
)

MAX_LENGTH = 60


def _normalize(s: str) -> str:
    """Нормализация: пробел между буквами и цифрами → дефис, обрезка до MAX_LENGTH."""
    if not s or len(s) > MAX_LENGTH:
        s = (s or "")[:MAX_LENGTH]
    s = s.strip()
    s = re.sub(r"\s+", "-", s)
    return s[:MAX_LENGTH]


def extract_device_model(text: str) -> Optional[str]:
    """
    Извлекает модель прибора из subject+body. Сначала известные модели, потом общий паттерн.
    Возвращает None, если ничего не найдено (без выдумывания).
    """
    if not (text or text.strip()):
        return None
    combined = (text or "").strip()
    if len(combined) > 10000:
        combined = combined[:10000]

    # 1) Известные модели (регистронезависимый поиск)
    for pattern in KNOWN_DEVICES:
        m = re.search(pattern, combined, re.IGNORECASE)
        if m:
            return _normalize(m.group(0))

    # 2) Общий паттерн (избегаем слишком коротких/случайных)
    for m in GENERAL_PATTERN.finditer(combined):
        candidate = m.group(1)
        if len(candidate) < 4:
            continue
        if re.match(r"^\d+$", candidate):
            continue
        return _normalize(candidate)

    return None
