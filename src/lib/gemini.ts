import { GoogleGenAI } from "@google/genai";
import { ItemDetails } from "./items";
import { CATEGORIES, CONDITIONS } from "./constants";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const key = process.env.GOOGLE_API_KEY ?? "";
  if (!key || key.includes("$")) {
    throw new Error("API-Key ist nicht gesetzt (GOOGLE_API_KEY pruefen)");
  }
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

const jsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    category: { type: "string" },
    era: { type: "string" },
    origin: { type: "string" },
    material: { type: "string" },
    dimensions: { type: "string" },
    condition: { type: "string" },
    description: { type: "string" },
    context: { type: "string" },
  },
  required: ["name", "category", "era", "origin", "material", "dimensions", "condition", "description", "context"],
  additionalProperties: false,
} as const;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function extractItemDetailsFromImage(
  images: { base64: string; mimeType: string }[]
): Promise<ItemDetails> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const imageParts = images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.base64 },
  }));

  const prompt =
    (images.length > 1
      ? "Du bekommst mehrere Fotos DERSELBEN antiken Sammlungsstücks. Kombiniere die Informationen aus ALLEN Bildern zu einer einzigen Beschreibung. "
      : "Du bekommst ein Foto eines antiken Sammlungsstücks. ") +
    "Analysiere das abgebildete Objekt und gib die Werte JSON zurück. Regeln: " +
    "name: der Titel/Name, wie er am Objekt steht – IMMER im Original belassen, NICHT übersetzen (z. B. 'Handfeuerwaffen Bewertung von Johan F. Stockel'). Falls kein sichtbarer Titel vorhanden ist, ein kurzer beschreibender Titel auf Deutsch (z. B. 'Porzellankanne', 'Standuhr'). " +
    "category: genau eine der folgenden Optionen: " +
    CATEGORIES.join(", ") +
    ". " +
    "era: die wahrscheinliche Epoche/Zeit (z. B. 'Jugendstil', 'Biedermeier') – beste Schätzung, sonst ''. " +
    "origin: Herkunft/Manufaktur/Signatur, falls sichtbar (z. B. 'Meißen'), sonst ''. " +
    "material: Materialien (z. B. 'Porzellan, Messing'), sonst ''. " +
    "dimensions: ungefähre Maße, falls sichtbar oder schätzbar (z. B. 'H 22 cm'), sonst ''. " +
    "condition: genau eines von: " +
    CONDITIONS.join(", ") +
    " – beste Schätzung, sonst ''. " +
    "description: eine sachliche Beschreibung auf Deutsch, die NUR das Aussehen/die Optik beschreibt (Ausführung, Details, Zustand, Material hier beschreiben) – nur was sichtbar ist. " +
    "context: Hintergrundwissen zu dem Objekt. Bei einem Buch: worum es im Werk geht und wofür es (bzw. der Autor) bekannt ist. Bei anderen Objekten: falls du sicher weißt, wofür das Stück bzw. der Stil/Hersteller bekannt ist, ein kurzer Satz (z. B. Manufaktur oder Epoche). Erfinde NICHTS – wenn du unsicher bist oder keine verlässlichen Angaben dazu hast, leeres Feld ''. Komplett auf Deutsch. " +
    "Erfinde KEINE Herkunft, keinen Besitzer und keine Geschichte (die gehören nicht in description oder context, solange sie nicht sicher bekannt sind). Eigennamen nicht übersetzen.";

  let parsed: Record<string, unknown> = {};
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
      },
    });
    if (!response.text) throw new Error("Leere Antwort vom Modell");
    const result = JSON.parse(response.text) as Record<string, unknown>;
    parsed = result;
    if (str(result.name)) break;
  }

  return {
    name: str(parsed.name),
    category: str(parsed.category),
    era: str(parsed.era),
    origin: str(parsed.origin),
    material: str(parsed.material),
    dimensions: str(parsed.dimensions),
    condition: str(parsed.condition),
    description: str(parsed.description),
    context: str(parsed.context),
  };
}
