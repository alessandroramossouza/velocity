import { GoogleGenAI, Type } from "@google/genai";
import { Car, AIAnalysisResult } from "../types";

// Initialize Gemini
// Note: In a production app, never expose keys on the client side.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '' });

const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Analyzes car details to suggest price and description.
 */
export const analyzeCarListing = async (
  make: string,
  model: string,
  year: number,
  category: string
): Promise<AIAnalysisResult> => {
  try {
    const prompt = `
      I am listing a car for rent on a P2P platform.
      Car Details: ${year} ${make} ${model} (${category}).
      
      Please generate:
      1. A competitive daily rental price in BRL (Brazilian Real) (just the number).
      2. A catchy, short marketing description (max 200 characters) in Portuguese.
      3. A list of 3-4 likely key features for this specific model (e.g., Ar condicionado, Bluetooth).
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedPrice: { type: Type.NUMBER },
            marketingDescription: { type: Type.STRING },
            features: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("Error analyzing car:", error);
    // Fallback data
    return {
      suggestedPrice: 150,
      marketingDescription: "Excelente carro para passeios urbanos e viagens curtas.",
      features: ["Ar Condicionado", "Direção Hidráulica"]
    };
  }
};

/**
 * Recommends cars based on a natural language query using the available inventory.
 */
export const getCarRecommendations = async (
  query: string,
  inventory: Car[]
): Promise<string[]> => {
  try {
    // Create a simplified inventory string for the context
    const inventoryContext = inventory.map(c =>
      `ID: ${c.id}, Car: ${c.year} ${c.make} ${c.model}, Type: ${c.category}, Price: R$${c.pricePerDay}, Features: ${c.features.join(', ')}`
    ).join('\n');

    const prompt = `
      You are a helpful car rental concierge.
      
      User Query: "${query}"
      
      Available Inventory:
      ${inventoryContext}
      
      Task: Select the best matching cars (max 3) IDs from the inventory based on the user's needs.
      Return ONLY a JSON object with an array of matching IDs.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedCarIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const result = JSON.parse(text);
    return result.recommendedCarIds || [];

  } catch (error) {
    console.error("Error recommending cars:", error);
    return [];
  }
};
