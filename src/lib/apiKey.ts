export function getGeminiApiKey(): string {
  const customKey = localStorage.getItem("custom_gemini_api_key");
  if (customKey && customKey.trim()) {
    return customKey.trim();
  }
  return (process.env.GEMINI_API_KEY as string) || "";
}

export function saveGeminiApiKey(key: string): void {
  localStorage.setItem("custom_gemini_api_key", key.trim());
  localStorage.setItem("custom_api_configured", "true");
}

export function clearGeminiApiKey(): void {
  localStorage.removeItem("custom_gemini_api_key");
  localStorage.removeItem("custom_api_configured");
}

export function isApiKeyConfigured(): boolean {
  return localStorage.getItem("custom_api_configured") === "true";
}
