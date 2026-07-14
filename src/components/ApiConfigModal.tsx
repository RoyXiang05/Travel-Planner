import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle, X, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { saveGeminiApiKey, getGeminiApiKey } from "../lib/apiKey";

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLang: "zh" | "en" | "ko";
  isDarkMode: boolean;
}

export default function ApiConfigModal({ isOpen, onClose, selectedLang, isDarkMode }: ApiConfigModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Pre-fill existing custom API Key if available
    const existing = localStorage.getItem("custom_gemini_api_key");
    if (existing) {
      setApiKey(existing);
    }
  }, [isOpen]);

  const t = (zh: string, en: string, ko: string) => {
    if (selectedLang === "zh") return zh;
    if (selectedLang === "en") return en;
    return ko;
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      setErrorMessage(t("请输入有效的 API Key", "Please enter a valid API Key", "올바른 API Key를 입력하세요"));
      setVerifyStatus("error");
      return;
    }
    saveGeminiApiKey(apiKey);
    onClose();
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setErrorMessage(t("请输入 API Key 后再进行测试", "Please enter an API Key to test", "테스트할 API Key를 입력하세요"));
      setVerifyStatus("error");
      return;
    }

    setIsVerifying(true);
    setVerifyStatus("idle");
    setErrorMessage("");

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "Respond with the word 'OK'.",
      });

      if (response.text && response.text.toUpperCase().includes("OK")) {
        setVerifyStatus("success");
      } else {
        throw new Error("Unexpected API response content");
      }
    } catch (err: any) {
      console.error("API Key validation error:", err);
      setVerifyStatus("error");
      setErrorMessage(err.message || t("连接测试失败，请检查 Key 的有效性或网络。", "Connection test failed. Please verify the key or check your network.", "연결 테스트 실패. Key 유효성 또는 네트워크를 확인하세요."));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    // Mark as configured so the popup won't keep appearing, but keep key empty to fall back to process.env
    localStorage.setItem("custom_api_configured", "true");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl transition-all"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={cn(
              "relative w-full max-w-lg rounded-[2.5rem] border shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] overflow-hidden z-10 transition-colors duration-500",
              isDarkMode 
                ? "bg-black/95 border-white/10 text-white" 
                : "bg-white/95 border-[#8b5e3c]/10 text-gray-800"
            )}
          >
            {/* Header pattern decorator */}
            <div className="absolute top-0 left-0 right-0 h-[100px] opacity-10 bg-gradient-to-b from-[#4a5d4e] to-transparent pointer-events-none" />

            <div className="p-8 md:p-10 space-y-6 relative">
              {/* Close Button */}
              <button
                onClick={onClose}
                className={cn(
                  "absolute top-6 right-6 p-2 rounded-full transition-colors",
                  isDarkMode ? "hover:bg-white/10 text-white/60 hover:text-white" : "hover:bg-[#8b5e3c]/5 text-gray-400 hover:text-gray-600"
                )}
              >
                <X size={20} />
              </button>

              {/* Title Section */}
              <div className="space-y-2 mt-4 text-center">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner",
                  isDarkMode ? "bg-white/5 text-amber-200" : "bg-[#4a5d4e]/10 text-[#4a5d4e]"
                )}>
                  <Key size={24} className="animate-pulse" />
                </div>
                <h2 className="font-serif text-2xl tracking-tight">
                  {t("配置 AI 智能网关", "Configure AI Intelligence", "AI 인텔리전스 설정")}
                </h2>
                <p className={cn(
                  "text-xs leading-relaxed max-w-sm mx-auto",
                  isDarkMode ? "text-white/50" : "text-gray-500"
                )}>
                  {t(
                    "设置您个人的 Gemini API Key 以解锁高保真多源攻略分析、每日行程智能推荐以及精准的当地天气同步服务。",
                    "Set your personal Gemini API Key to unlock loss-less travel itinerary synthesis, daily routing, and live weather sync.",
                    "고품질 여행 일정 합성, 일일 추천 및 실시간 현지 날씨 동기화를 잠금 해제하려면 개인 Gemini API Key를 설정하십시오."
                  )}
                </p>
              </div>

              {/* Input section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={cn(
                    "text-[0.625rem] font-bold uppercase tracking-wider block",
                    isDarkMode ? "text-white/40" : "text-gray-400"
                  )}>
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        if (verifyStatus !== "idle") setVerifyStatus("idle");
                        if (errorMessage) setErrorMessage("");
                      }}
                      placeholder={t("输入您的 API Key (AI_Studio_API_Key)", "Enter your API Key...", "API Key를 입력하십시오...")}
                      className={cn(
                        "w-full px-5 py-4 rounded-2xl text-xs font-mono transition-all pr-12 focus:outline-none focus:ring-2",
                        isDarkMode
                          ? "bg-white/5 border border-white/10 focus:ring-white/20 text-white placeholder-white/20"
                          : "bg-gray-50 border border-gray-100 focus:ring-[#4a5d4e]/20 text-gray-800 placeholder-gray-300"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className={cn(
                        "absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
                        isDarkMode ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Status Indicator */}
                {verifyStatus === "success" && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-serif">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{t("API Key 测试连接成功！您可以放心使用。", "API Key connection test successful!", "API Key 연결 테스트 완료! 성공적으로 설정되었습니다.")}</span>
                  </div>
                )}

                {verifyStatus === "error" && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">{t("连接测试失败", "Test Failed", "연결 실패")}</p>
                      <p className="opacity-80 text-[10px] leading-relaxed">{errorMessage}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleTestKey}
                    disabled={isVerifying}
                    className={cn(
                      "py-3.5 rounded-2xl flex items-center justify-center gap-2 font-serif font-bold text-xs transition-all border",
                      isDarkMode
                        ? "border-white/10 hover:bg-white/5 text-white disabled:opacity-50"
                        : "border-[#4a5d4e]/20 hover:bg-[#4a5d4e]/5 text-[#4a5d4e] disabled:opacity-50"
                    )}
                  >
                    {isVerifying ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {t("测试连接", "Test Connection", "테스트 연결")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isVerifying}
                    className={cn(
                      "py-3.5 rounded-2xl flex items-center justify-center gap-2 font-serif font-bold text-xs transition-all shadow-md",
                      isDarkMode
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-[#4a5d4e] text-white hover:bg-[#3d4d40]"
                    )}
                  >
                    {t("保存配置", "Save Config", "설정 저장")}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={handleSkip}
                    className={cn(
                      "text-[10px] font-bold tracking-wider uppercase transition-colors hover:underline",
                      isDarkMode ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {t("跳过，使用演示系统 Key", "Skip, use demo key", "건너뛰고 데모 Key 사용")}
                  </button>
                </div>
              </div>

              {/* Secure storage badge */}
              <div className="flex items-center justify-center gap-1.5 opacity-40 text-[9px] uppercase tracking-widest text-center mt-2">
                <ShieldAlert size={10} />
                <span>{t("Key 安全存储于本地浏览器", "Stored securely in local storage", "개인정보는 브라우저에 안전하게 저장됩니다")}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
