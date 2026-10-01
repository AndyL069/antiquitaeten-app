# backend/app/constants.py
from typing import Final

CATEGORIES: Final[list[str]] = [
    "Möbel",
    "Gemälde",
    "Skulptur",
    "Keramik",
    "Glas",
    "Münze",
    "Schmuck",
    "Textil",
    "Uhr",
    "Silber",
    "Buch",
    "Sonstiges",
]

ERAS: Final[list[str]] = [
    "Antike",
    "Ägypten",
    "Griechisch",
    "Römisch",
    "Mittelalter",
    "Renaissance",
    "Barock",
    "Rokoko",
    "Klassizismus",
    "Biedermeier",
    "Gründerzeit",
    "Jugendstil",
    "Art déco",
    "Moderne",
    "Sonstige",
]

CONDITIONS: Final[list[str]] = [
    "Sehr gut",
    "Gut",
    "Befriedigend",
    "Schlecht",
    "Restaurierungsbedürftig",
]

EBAY_CONDITIONS: Final[list[str]] = [
    "Neu",
    "Neu: Sonstige",
    "Gebraucht",
    "Sehr gut",
    "Gut",
    "Akzeptabel",
    "Als Ersatzteil / defekt",
]

CURRENCIES: Final[list[str]] = [
    "EUR",
    "USD",
    "CHF",
    "GBP",
]
