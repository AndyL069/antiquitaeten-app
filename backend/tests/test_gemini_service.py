# backend/tests/test_gemini_service.py
import io
import json
from unittest.mock import MagicMock, patch
import pytest
from PIL import Image
from fastapi import HTTPException

from app.constants import CATEGORIES, CONDITIONS, CURRENCIES, EBAY_CONDITIONS, ERAS
from app.config import settings
from app.services.gemini_service import (
    ItemDetailsAnalysis,
    parse_gemini_response,
    resize_image,
    extract_item_details_from_images,
)


def test_constants():
    assert "Möbel" in CATEGORIES
    assert "Buch" in CATEGORIES
    assert "Biedermeier" in ERAS
    assert "Sehr gut" in CONDITIONS
    assert "EUR" in CURRENCIES
    assert "Neu" in EBAY_CONDITIONS


def test_parse_gemini_response():
    sample_json = {
        "name": "Biedermeier Kommode",
        "category": "Möbel",
        "era": "Biedermeier",
        "origin": "Süddeutschland",
        "material": "Kirschbaum furniert",
        "dimensions": "H 90 cm, B 110 cm",
        "condition": "Gut",
        "description": "Dreischübige Kommode mit Messingbeschlägen.",
        "context": "Typisches Möbelstück der Biedermeierzeit um 1830.",
        "startPrice": 250.0,
        "buyItNowPrice": 650.0,
        "estimatedValue": 600.0,
        "valueNote": "Kirschbaumholz, guter Erhaltungszustand",
    }
    result = parse_gemini_response(sample_json)
    assert isinstance(result, ItemDetailsAnalysis)
    assert result.name == "Biedermeier Kommode"
    assert result.category == "Möbel"
    assert result.era == "Biedermeier"
    assert result.estimatedValue == 600.0
    assert result.startPrice == 250.0
    assert result.buyItNowPrice == 650.0
    assert result.weight == ""
    assert result.ebayTitle == ""


def test_parse_gemini_response_handles_nulls_and_types():
    data = {
        "name": "   Alte Wanduhr  ",
        "category": None,
        "startPrice": "150.50",
        "buyItNowPrice": None,
        "estimatedValue": "invalid",
        "valueNote": None,
    }
    result = parse_gemini_response(data)
    assert result.name == "Alte Wanduhr"
    assert result.category == ""
    assert result.startPrice == 150.50
    assert result.buyItNowPrice == 0.0
    assert result.estimatedValue == 0.0
    assert result.valueNote == ""


def test_image_resizing_helper():
    # Create large image: 2400 x 1800
    img = Image.new("RGB", (2400, 1800), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    original_bytes = buf.getvalue()

    resized_bytes = resize_image(original_bytes, max_dimension=1600, quality=85)
    assert resized_bytes is not None

    with Image.open(io.BytesIO(resized_bytes)) as result_img:
        assert result_img.format == "JPEG"
        width, height = result_img.size
        assert width == 1600
        assert height == 1200

    # Image smaller than 1600 should not be upscaled
    small_img = Image.new("RGB", (800, 600), color="green")
    small_buf = io.BytesIO()
    small_img.save(small_buf, format="JPEG")
    small_bytes = small_buf.getvalue()

    small_resized = resize_image(small_bytes, max_dimension=1600)
    with Image.open(io.BytesIO(small_resized)) as result_small:
        assert result_small.size == (800, 600)


def test_missing_api_key_raises_error(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    img = Image.new("RGB", (100, 100), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    with pytest.raises((HTTPException, ValueError)) as excinfo:
        extract_item_details_from_images([(img_bytes, "image/jpeg")])

    err_msg = str(excinfo.value.detail if hasattr(excinfo.value, "detail") else excinfo.value)
    assert "API-Key" in err_msg or "API-Schlüssel" in err_msg or "GOOGLE_API_KEY" in err_msg


@patch("app.services.gemini_service.genai.Client")
def test_extract_item_details_from_images_single(mock_client_cls, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "test-key-12345")

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    sample_output = {
        "name": "Jugendstil Vase",
        "category": "Glas",
        "era": "Jugendstil",
        "origin": "Bohemien",
        "material": "Glas",
        "dimensions": "H 25 cm",
        "condition": "Sehr gut",
        "description": "Grüne Jugendstil-Glasvase mit Goldauflage.",
        "context": "Typisches böhmisches Glas um 1905.",
        "author": "",
        "publisher": "",
        "publicationYear": "",
        "edition": "",
        "language": "",
        "weight": "",
        "ebayTitle": "Antike Jugendstil Vase Glas Böhmen um 1905",
        "ebayCategory": "Antiquitäten & Kunst > Glas & Kristall",
        "ebayCondition": "Sehr gut",
        "ebayConditionNote": "Keine Bestoßungen",
        "startPrice": 80.0,
        "buyItNowPrice": 180.0,
        "estimatedValue": 160.0,
        "valueNote": "Sehr guter Erhaltungszustand",
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(sample_output)
    mock_client.models.generate_content.return_value = mock_response

    img = Image.new("RGB", (200, 200), color="yellow")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    result = extract_item_details_from_images([(buf.getvalue(), "image/jpeg")])

    assert isinstance(result, ItemDetailsAnalysis)
    assert result.name == "Jugendstil Vase"
    assert result.category == "Glas"
    assert result.estimatedValue == 160.0

    mock_client_cls.assert_called_once_with(api_key="test-key-12345")
    mock_client.models.generate_content.assert_called_once()
    call_kwargs = mock_client.models.generate_content.call_args.kwargs
    assert call_kwargs["model"] == settings.GEMINI_MODEL
    # Check prompt contains singular wording
    assert any("ein Foto eines antiken" in str(item) for item in call_kwargs["contents"])


@patch("app.services.gemini_service.genai.Client")
def test_extract_item_details_from_images_multiple(mock_client_cls, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key-gemini")

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    sample_output = {
        "name": "Barock Engel",
        "category": "Skulptur",
        "era": "Barock",
        "origin": "Alpenländisch",
        "material": "Holz geschnitzt",
        "dimensions": "H 45 cm",
        "condition": "Gut",
        "description": "Barocker Puttenengel aus Lindenholz.",
        "context": "Sakrale Schnitzkunst 18. Jh.",
        "author": "",
        "publisher": "",
        "publicationYear": "",
        "edition": "",
        "language": "",
        "weight": "",
        "ebayTitle": "Barock Putto Engel Holzfigur geschnitzt 18. Jh.",
        "ebayCategory": "Skulpturen",
        "ebayCondition": "Gut",
        "ebayConditionNote": "Fassung stellenweise berieben",
        "startPrice": 190.0,
        "buyItNowPrice": 450.0,
        "estimatedValue": 400.0,
        "valueNote": "Originale Fassung teilweise erhalten",
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(sample_output)
    mock_client.models.generate_content.return_value = mock_response

    img1 = Image.new("RGB", (100, 100), color="red")
    buf1 = io.BytesIO()
    img1.save(buf1, format="JPEG")

    img2 = Image.new("RGB", (100, 100), color="blue")
    buf2 = io.BytesIO()
    img2.save(buf2, format="JPEG")

    images = [(buf1.getvalue(), "image/jpeg"), (buf2.getvalue(), "image/jpeg")]
    result = extract_item_details_from_images(images)

    assert result.name == "Barock Engel"
    call_kwargs = mock_client.models.generate_content.call_args.kwargs
    assert any("mehrere Fotos DERSELBEN" in str(item) for item in call_kwargs["contents"])


def test_parse_gemini_response_german_comma_floats():
    data = {
        "name": "Jugendstil Lampe",
        "startPrice": "120,50",
        "buyItNowPrice": "350,00",
        "estimatedValue": "300,75",
    }
    result = parse_gemini_response(data)
    assert result.startPrice == 120.50
    assert result.buyItNowPrice == 350.00
    assert result.estimatedValue == 300.75


def test_resize_image_corrupted_format():
    with pytest.raises(HTTPException) as excinfo:
        resize_image(b"not an actual image file", max_dimension=1600)
    assert excinfo.value.status_code == 400
    assert "Ungültiges oder beschädigtes Bildformat" in excinfo.value.detail


@patch("app.services.gemini_service.genai.Client")
def test_extract_item_details_gemini_api_exception(mock_client_cls, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "test-key")
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.side_effect = RuntimeError("Network timeout connecting to Gemini API")

    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    with pytest.raises(HTTPException) as excinfo:
        extract_item_details_from_images([(buf.getvalue(), "image/jpeg")])

    assert excinfo.value.status_code == 502
    assert "Gemini-Modellaufruf fehlgeschlagen" in excinfo.value.detail


@patch("app.services.gemini_service.genai.Client")
def test_extract_item_details_retry_on_empty_name(mock_client_cls, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "test-key")
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    # First attempt returns empty name, second attempt returns valid name
    res1 = MagicMock()
    res1.text = json.dumps({"name": "", "category": "Möbel"})
    res2 = MagicMock()
    res2.text = json.dumps({"name": "Biedermeier Sekretär", "category": "Möbel"})
    mock_client.models.generate_content.side_effect = [res1, res2]

    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    result = extract_item_details_from_images([(buf.getvalue(), "image/jpeg")])
    assert result.name == "Biedermeier Sekretär"
    assert mock_client.models.generate_content.call_count == 2


@patch("app.services.gemini_service.genai.Client")
def test_extract_item_details_list_response_unwrapped(mock_client_cls, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "test-key")
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_resp = MagicMock()
    mock_resp.text = json.dumps([{"name": "Silberne Teekanne", "category": "Silber"}])
    mock_client.models.generate_content.return_value = mock_resp

    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    result = extract_item_details_from_images([(buf.getvalue(), "image/jpeg")])
    assert result.name == "Silberne Teekanne"
    assert result.category == "Silber"

