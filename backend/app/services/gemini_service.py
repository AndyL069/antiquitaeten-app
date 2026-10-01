# backend/app/services/gemini_service.py
import io
import json
import math
from typing import Any, Optional
from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
import google.genai as genai
from google.genai import types
from pydantic import BaseModel, ConfigDict

from app.config import settings
from app.constants import CATEGORIES, CONDITIONS, EBAY_CONDITIONS


class ItemDetailsAnalysis(BaseModel):
    name: str = ""
    category: str = ""
    era: str = ""
    origin: str = ""
    material: str = ""
    dimensions: str = ""
    condition: str = ""
    description: str = ""
    context: str = ""
    author: str = ""
    publisher: str = ""
    publicationYear: str = ""
    edition: str = ""
    language: str = ""
    weight: str = ""
    ebayTitle: str = ""
    ebayCategory: str = ""
    ebayCondition: str = ""
    ebayConditionNote: str = ""
    startPrice: float = 0.0
    buyItNowPrice: float = 0.0
    estimatedValue: float = 0.0
    valueNote: str = ""

    model_config = ConfigDict(extra="ignore")


def _clean_str(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    return str(val).strip()


def _clean_float(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        if isinstance(val, str):
            val = val.replace(",", ".").strip()
        f = float(val)
        return f if math.isfinite(f) else 0.0
    except (ValueError, TypeError):
        return 0.0


def parse_gemini_response(data: dict) -> ItemDetailsAnalysis:
    """Parses and sanitizes dictionary from Gemini JSON response into ItemDetailsAnalysis."""
    if not isinstance(data, dict):
        raise ValueError("Erwartetes Dictionary für Gemini-Antwortdaten")

    cleaned = {
        "name": _clean_str(data.get("name")),
        "category": _clean_str(data.get("category")),
        "era": _clean_str(data.get("era")),
        "origin": _clean_str(data.get("origin")),
        "material": _clean_str(data.get("material")),
        "dimensions": _clean_str(data.get("dimensions")),
        "condition": _clean_str(data.get("condition")),
        "description": _clean_str(data.get("description")),
        "context": _clean_str(data.get("context")),
        "author": _clean_str(data.get("author")),
        "publisher": _clean_str(data.get("publisher")),
        "publicationYear": _clean_str(data.get("publicationYear")),
        "edition": _clean_str(data.get("edition")),
        "language": _clean_str(data.get("language")),
        "weight": _clean_str(data.get("weight")),
        "ebayTitle": _clean_str(data.get("ebayTitle")),
        "ebayCategory": _clean_str(data.get("ebayCategory")),
        "ebayCondition": _clean_str(data.get("ebayCondition")),
        "ebayConditionNote": _clean_str(data.get("ebayConditionNote")),
        "startPrice": _clean_float(data.get("startPrice")),
        "buyItNowPrice": _clean_float(data.get("buyItNowPrice")),
        "estimatedValue": _clean_float(data.get("estimatedValue")),
        "valueNote": _clean_str(data.get("valueNote")),
    }
    return ItemDetailsAnalysis(**cleaned)


def resize_image(image_bytes: bytes, max_dimension: int = 1600, quality: int = 85) -> bytes:
    """Downsamples image bytes using Pillow to max_dimension and converts to JPEG bytes."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = ImageOps.exif_transpose(img)

            if img.mode != "RGB":
                img = img.convert("RGB")

            width, height = img.size
            if max(width, height) > max_dimension:
                scale = max_dimension / max(width, height)
                new_size = (int(round(width * scale)), int(round(height * scale)))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

            out_buf = io.BytesIO()
            img.save(out_buf, format="JPEG", quality=quality, optimize=True)
            return out_buf.getvalue()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Ungültiges oder beschädigtes Bildformat",
        ) from exc


# Alias for compatibility
resize_image_bytes = resize_image


def build_gemini_prompt(image_count: int = 1) -> str:
    """Constructs prompt containing German appraisal and categorization guidelines."""
    intro = (
        "Du bekommst mehrere Fotos DERSELBEN antiken Sammlungsstücks. Kombiniere die Informationen aus ALLEN Bildern zu einer einzigen Beschreibung. "
        if image_count > 1
        else "Du bekommst ein Foto eines antiken Sammlungsstücks. "
    )

    rules = (
        "Analysiere das abgebildete Objekt und gib die Werte JSON zurück. Regeln: "
        "name: der Titel/Name, wie er am Objekt steht – IMMER im Original belassen, NICHT übersetzen (z. B. 'Handfeuerwaffen Bewertung von Johan F. Stockel'). Falls kein sichtbarer Titel vorhanden ist, ein kurzer beschreibender Titel auf Deutsch (z. B. 'Porzellankanne', 'Standuhr'). "
        f"category: genau eine der folgenden Optionen: {', '.join(CATEGORIES)}. "
        "era: die Epoche/Zeit IMMER AUF DEUTSCH (z. B. 'Mitte des 20. Jahrhunderts', 'Jugendstil', 'Biedermeier'), nie in englischer Sprache – beste Schätzung aus dem Bild, sonst ''. "
        "origin: Herkunft/Manufaktur/Signatur, falls sichtbar (z. B. 'Meißen'), sonst ''. "
        "material: Materialien (z. B. 'Porzellan, Messing'), sonst ''. "
        "dimensions: ungefähre Maße, falls sichtbar oder schätzbar (z. B. 'H 22 cm'), sonst ''. "
        f"condition: genau eines von: {', '.join(CONDITIONS)} – beste Schätzung, sonst ''. "
        "description: eine sachliche Beschreibung auf Deutsch, die NUR das Aussehen/die Optik beschreibt (Ausführung, Details, Zustand, Material hier beschreiben) – nur was sichtbar ist. "
        "context: Hintergrundwissen zu dem Objekt. Bei einem Buch: worum es im Werk geht und wofür es (bzw. der Autor) bekannt ist. Bei anderen Objekten: falls du sicher weißt, wofür das Stück bzw. der Stil/Hersteller bekannt ist, ein kurzer Satz (z. B. Manufaktur oder Epoche). Erfinde NICHTS – wenn du unsicher bist oder keine verlässlichen Angaben dazu hast, leeres Feld ''. Komplett auf Deutsch. "
        "estimatedValue: schätze den Marktwert des Stücks in EUR anhand erkennbarer Merkmale (Material, Qualität, Epoche, Zustand, ggf. Hersteller/Signatur). Sei konservativ und realistisch – eher leicht unter- als überschätzen. Ohne belastbare Grundlage gib 0. "
        "valueNote: ein kurzer Begründungssatz auf Deutsch zur Schätzung (z. B. 'Porzellan, gute Erhaltung, Jugendstil'), sonst ''. "
        "author: der Autor / die Autorin, falls auf dem Buch sichtbar (Titelseite), sonst ''. "
        "publisher: der Verlag bzw. Hersteller, falls sichtbar, sonst ''. "
        "publicationYear: das Erscheinungsjahr, falls sichtbar, sonst ''. "
        "edition: die Auflage, falls sichtbar (z. B. '1. Auflage'), sonst ''. "
        "language: die Sprache des Textes (z. B. 'Dänisch'), sonst ''. "
        "weight: IMMER leeres Feld '' – Gewicht ist aus einem Foto nicht bestimmbar. "
        "ebayTitle: ein ausführlicher, suchoptimierter eBay-Verkaufstitel (max. ca. 80 Zeichen) auf Grundlage des Objekts, z. B. 'Antikes Buch Handfeuerwaffen – Johan F. Stöckel, 1938'. "
        "ebayCategory: die wahrscheinlichste eBay-Kategorie (z. B. 'Bücher > Antiquarische Bücher'), beste Schätzung, sonst ''. "
        f"ebayCondition: genau eines von: {', '.join(EBAY_CONDITIONS)} – anhand des sichtbaren Zustands, sonst ''. "
        "ebayConditionNote: kurze Beschreibung des sichtbaren Zustands (Abnutzung, Einband, Seiten), sonst ''. "
        "startPrice: ein konservativer Startpreis in EUR für eine Auktion (deutlich unter dem Marktwert, um Bieter zu locken), 0 wenn keine Grundlage. "
        "buyItNowPrice: ein realistischer 'Sofort-Kaufen'-Preis in EUR (in Nähe des Marktwerts), 0 wenn keine Grundlage. "
        "Alle beschreibenden Werte (era, origin, material, dimensions, description, context, ebayTitle, ebayCategory, ebayCondition, ebayConditionNote, language) IMMER AUF DEUTSCH ausgeben, auch wenn das Objekt englischsprachig ist. Nur Eigennamen (author, publisher), Zahlen (Jahre, Preise) und der 'name' bleiben im Original. "
        "Erfinde KEINE Herkunft, keinen Besitzer und keine Geschichte (die gehören nicht in description oder context, solange sie nicht sicher bekannt sind). Eigennamen nicht übersetzen."
    )
    return intro + rules


def extract_item_details_from_images(images: list[tuple[bytes, str]]) -> ItemDetailsAnalysis:
    """Analyzes antique item photos using Gemini vision API to extract structured antique item details."""
    api_key = (settings.GOOGLE_API_KEY or settings.GEMINI_API_KEY or "").strip()
    if not api_key or api_key.startswith("$"):
        raise HTTPException(
            status_code=500,
            detail="API-Key ist nicht gesetzt (GOOGLE_API_KEY oder GEMINI_API_KEY prüfen)",
        )

    if not images:
        raise HTTPException(
            status_code=400,
            detail="Keine Bilder zur Analyse übergeben",
        )

    parts: list[Any] = []
    for img_bytes, _ in images:
        resized_bytes = resize_image(img_bytes, max_dimension=1600, quality=85)
        part = types.Part.from_bytes(data=resized_bytes, mime_type="image/jpeg")
        parts.append(part)

    prompt = build_gemini_prompt(image_count=len(images))
    contents: list[Any] = [*parts, prompt]

    client = genai.Client(api_key=api_key)
    last_error: Optional[Exception] = None
    last_result: Optional[ItemDetailsAnalysis] = None

    for attempt in range(2):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    response_mime_type="application/json",
                    response_schema=ItemDetailsAnalysis,
                ),
            )
        except Exception as exc:
            last_error = exc
            if attempt == 0:
                continue
            raise HTTPException(
                status_code=502,
                detail=f"Gemini-Modellaufruf fehlgeschlagen: {str(exc)}",
            ) from exc

        if not response or not response.text:
            last_error = HTTPException(status_code=502, detail="Leere Antwort vom Modell erhalten")
            if attempt == 0:
                continue
            raise last_error

        raw_text = response.text.strip()
        # Strip markdown fences if present
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            last_error = HTTPException(
                status_code=502,
                detail=f"Ungültige JSON-Antwort von Gemini: {str(exc)}",
            )
            if attempt == 0:
                continue
            raise last_error from exc

        if isinstance(data, list):
            data = data[0] if data and isinstance(data[0], dict) else {}

        try:
            parsed = parse_gemini_response(data)
        except ValueError as exc:
            last_error = HTTPException(status_code=502, detail=str(exc))
            if attempt == 0:
                continue
            raise last_error from exc

        last_result = parsed
        if parsed.name:
            return parsed

    if last_result is not None:
        return last_result

    if isinstance(last_error, HTTPException):
        raise last_error
    raise HTTPException(
        status_code=502,
        detail=f"Gemini-Modellaufruf fehlgeschlagen: {str(last_error)}",
    )
