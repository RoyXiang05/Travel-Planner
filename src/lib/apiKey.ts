import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export function cleanApiKey(key: string): string {
  let cleaned = key.trim();
  // Strip outer quotes if users accidentally copied them
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export async function generateGeminiContent(
  params: {
    contents: string | any[];
    config?: any;
    model?: string;
  }
): Promise<GenerateContentResponse> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  // Try models in order of preference
  const modelsToTry = [
    params.model || "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  
  // Remove duplicates
  const uniqueModels = Array.from(new Set(modelsToTry));
  
  let lastError: any = null;
  
  for (const model of uniqueModels) {
    try {
      console.log(`[Gemini API] Attempting generation with model: ${model}`);
      
      const callParams: any = {
        model: model,
        contents: typeof params.contents === "string"
          ? [{ role: "user", parts: [{ text: params.contents }] }]
          : params.contents
      };
      
      if (params.config) {
        callParams.config = params.config;
      }
      
      const response = await ai.models.generateContent(callParams);
      if (response && response.text) {
        return response;
      }
      throw new Error("Empty response received from Gemini model");
    } catch (err: any) {
      console.warn(`[Gemini API] Model ${model} failed:`, err);
      lastError = err;
      
      // Stop fallback early if it is a clear authorization or invalid API key issue (400, 403)
      const status = err?.status || err?.code;
      const isAuthError = status === 400 || status === 403 || String(err?.message || "").includes("API key not valid");
      if (isAuthError) {
        throw err;
      }
    }
  }
  
  throw lastError;
}

export function getGeminiApiKey(): string {
  const customKey = localStorage.getItem("custom_gemini_api_key");
  if (customKey) {
    return cleanApiKey(customKey);
  }
  return (process.env.GEMINI_API_KEY as string) || "";
}

export function saveGeminiApiKey(key: string): void {
  localStorage.setItem("custom_gemini_api_key", cleanApiKey(key));
  localStorage.setItem("custom_api_configured", "true");
}

export function clearGeminiApiKey(): void {
  localStorage.removeItem("custom_gemini_api_key");
  localStorage.removeItem("custom_api_configured");
}

export function isApiKeyConfigured(): boolean {
  return localStorage.getItem("custom_api_configured") === "true";
}

export function getGeminiErrorMessage(err: any): string {
  if (!err) return "Unknown error";
  
  if (err.status) {
    return `[API Error ${err.status}] ${err.message || ""}`;
  }
  
  if (err.message) {
    try {
      if (err.message.includes("{")) {
        const jsonStr = err.message.substring(err.message.indexOf("{"));
        const parsed = JSON.parse(jsonStr);
        if (parsed.error?.message) {
          return parsed.error.message;
        }
      }
    } catch (e) {
      // Ignore JSON parsing issues
    }
    return err.message;
  }
  
  try {
    return JSON.stringify(err);
  } catch (e) {
    return String(err);
  }
}

