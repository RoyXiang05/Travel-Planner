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

