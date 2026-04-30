import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FoodNutrition {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
}

export async function lookupFood(description: string): Promise<FoodNutrition[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this food description and provide nutritional information (calories, protein, carbs, fat) for each item mentioned. Use grams for macros. Description: "${description}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
            servingSize: { type: Type.STRING }
          },
          required: ["foodName", "calories", "protein", "carbs", "fat", "servingSize"]
        }
      }
    }
  });

  try {
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

export async function analyzeImage(base64Image: string, mimeType: string): Promise<FoodNutrition[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          { text: "Analyze the food in this image and provide nutritional information (calories, protein, carbs, fat) for each item identified. Use grams for macros." },
          { inlineData: { data: base64Image, mimeType } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
            servingSize: { type: Type.STRING }
          },
          required: ["foodName", "calories", "protein", "carbs", "fat", "servingSize"]
        }
      }
    }
  });

  try {
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini image response", e);
    return [];
  }
}
