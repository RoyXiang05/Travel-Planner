import { useState } from "react";
import { 
  Calendar, 
  Map as MapIcon, 
  Settings, 
  AlertTriangle, 
  Coffee, 
  Search,
  FileText,
  Navigation,
  Sun,
  Snowflake,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface ControlsProps {
  selectedLang: "zh" | "en" | "ko";
  setSelectedLang: (l: "zh" | "en" | "ko") => void;
  selectedDay: number | null;
  setSelectedDay: (d: number | null) => void;
  plannedPlan: any;
  viewMode: "summer" | "winter";
  setViewMode: (mode: "summer" | "winter") => void;
  showHazards: boolean;
  setShowHazards: (show: boolean) => void;
  showPois: boolean;
  setShowPois: (show: boolean) => void;
  onSearchEvents: (city: string) => void;
  onPlanRoute: (links: string[], demands: string, destination: string, baseLocation: string) => void;
  isProcessing: boolean;
}

export default function Controls({
  selectedLang,
  setSelectedLang,
  selectedDay,
  setSelectedDay,
  plannedPlan,
  viewMode,
  setViewMode,
  showHazards,
  setShowHazards,
  showPois,
  setShowPois,
  onSearchEvents,
  onPlanRoute,
  isProcessing
}: ControlsProps) {
  const [links, setLinks] = useState<string[]>([""]);
  const [destination, setDestination] = useState("Georgia");
  const [baseLoc, setBaseLoc] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [demands, setDemands] = useState("");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const t = (zh: string, en: string, ko: string) => {
    if (selectedLang === "zh") return zh;
    if (selectedLang === "en") return en;
    return ko;
  };

  const dayCount = plannedPlan ? Math.max(...[...(plannedPlan.checkpoints || []), ...(plannedPlan.venues || [])].map(i => i.day || 0), 0) : 0;

  const addLink = () => {
    if (links.length < 5) setLinks([...links, ""]);
  };

  const handlePlan = () => {
    const combinedDemands = `
      Destination: ${destination},
      Base Location/Start Point: ${baseLoc},
      Dates: ${startDate} to ${endDate},
      User Custom Notes: ${demands}
    `;
    onPlanRoute(links.filter(l => l.trim()), combinedDemands, destination, baseLoc);
  };

  const updateLink = (index: number, val: string) => {
    const next = [...links];
    next[index] = val;
    setLinks(next);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="fixed top-4 md:top-6 left-4 right-4 md:left-6 md:right-6 flex flex-col md:flex-row justify-end items-end md:items-center gap-2 md:gap-4 z-[1000]">
        <div className="flex flex-wrap justify-end gap-2 md:gap-4 min-w-0">
          {/* Day Selector */}
          {plannedPlan && (
            <div className="bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-lg md:shadow-sm flex items-center border border-[#4a5d4e]/10 overflow-x-auto max-w-[80vw] no-scrollbar">
              <button
                onClick={() => setSelectedDay(null)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap",
                  selectedDay === null ? "bg-[#4a5d4e] text-white" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {t("全行程", "All Day", "전체 일정")}
              </button>
              {Array.from({ length: dayCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i + 1)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap",
                    selectedDay === i + 1 ? "bg-[#4a5d4e] text-white" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Day {i + 1}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm flex items-center gap-4 border border-[#4a5d4e]/10">
            <div className="flex items-center gap-2 border-r border-gray-100 pr-4">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold text-[#4a5d4e]">14°C</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">6:00 AM GST</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
          </div>
          
          <div className="flex bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-lg md:shadow-sm border border-[#4a5d4e]/10 shrink-0 overflow-hidden">
            {[
              { id: "zh", label: "中文" },
              { id: "en", label: "EN" },
              { id: "ko", label: "한국어" }
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => setSelectedLang(lang.id as any)}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  selectedLang === lang.id 
                    ? "bg-[#4a5d4e] text-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed top-0 left-0 z-[1010] flex items-center liquid-container h-full">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: isSidebarOpen ? 0 : "calc(-100% + 0px)" }}
          transition={{ type: "spring", damping: 25, stiffness: 150 }}
          className={cn(
            "w-[280px] sm:w-80 bg-white/98 backdrop-blur shadow-2xl rounded-r-[2rem] sm:rounded-r-[2.5rem] p-4 sm:p-6 border-r border-[#8b5e3c]/15 flex flex-col relative h-full transition-shadow",
            !isSidebarOpen && "shadow-none"
          )}
        >
          {/* Enhanced Liquid Toggle Button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-8 h-20 sm:w-10 sm:h-24 bg-white shadow-[10px_0_20px_rgba(139,94,60,0.15)] border-r border-y border-[#8b5e3c]/20 rounded-r-[1.5rem] sm:rounded-r-[2rem] flex items-center justify-center text-[#8b5e3c] hover:bg-gray-50 transition-all z-50",
              isSidebarOpen ? "-right-8 sm:-right-10" : "-right-10 sm:-right-12 bg-[#8b5e3c] text-white border-transparent shadow-[5px_0_15px_rgba(0,0,0,0.1)]"
            )}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
            ) : (
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
            )}
          </button>
          
          <div className="space-y-4 pr-2">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400">{t("目的地", "Destination", "목적지")}</label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t("你去哪里？", "Where are you going?", "어디로 가시나요?")}
                className="w-full bg-[#fdfaf6] border border-[#8b5e3c]/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4a5d4e]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400">{t("中心位置 (如：机场)", "Base Location (e.g. Airport)", "거점 위치 (예: 공항)")}</label>
              <input
                value={baseLoc}
                onChange={(e) => setBaseLoc(e.target.value)}
                placeholder={t("你的基地/到达地在哪？", "Where is your base/arrival?", "거점/도착지는 어디인가요?")}
                className="w-full bg-[#fdfaf6] border border-[#8b5e3c]/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4a5d4e]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold text-gray-400">{t("社交媒体链接", "Social Links", "소셜 링크")}</label>
                {links.length < 5 && (
                  <button onClick={addLink} className="text-[10px] text-[#4a5d4e] hover:underline">+ {t("添加", "Add", "추가")}</button>
                )}
              </div>
              {links.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={link}
                    onChange={(e) => updateLink(idx, e.target.value)}
                    placeholder="Paste link here..."
                    className="flex-1 bg-[#fdfaf6] border border-[#8b5e3c]/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4a5d4e]"
                  />
                  {links.length > 1 && (
                    <button onClick={() => removeLink(idx)} className="text-gray-300 hover:text-red-400">×</button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase font-bold text-gray-400">{t("行程偏好", "Travel Preferences", "여행 취향")}</label>
              
              <div className="space-y-3 p-4 bg-[#fdfaf6] border border-[#8b5e3c]/5 rounded-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-gray-400">{t("开始日期", "START DATE", "시작일")}</span>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white border border-gray-100 rounded-lg px-2 py-1.5 text-[10px] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-gray-400">{t("结束日期", "END DATE", "종료일")}</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white border border-gray-100 rounded-lg px-2 py-1.5 text-[10px] outline-none"
                    />
                  </div>
                </div>
              </div>

              <label className="text-[10px] uppercase font-bold text-gray-400">{t("具体要求", "Specific Requirements", "상세 요구사항")}</label>
              <textarea
                value={demands}
                onChange={(e) => setDemands(e.target.value)}
                placeholder={t("例如：过敏、对老年人方便...", "e.g. Need gluten-free, accessible for elderly...", "예: 알레르기 있음, 노약자 동반...")}
                className="w-full bg-[#fdfaf6] border border-[#8b5e3c]/10 rounded-xl p-3 text-xs text-gray-700 h-16 resize-none focus:outline-none focus:border-[#4a5d4e]"
              />
            </div>

            <button
              onClick={handlePlan}
              disabled={isProcessing}
              className="w-full bg-[#4a5d4e] text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-lg hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            >
              {isProcessing ? <RefreshCw className="animate-spin w-4 h-4" /> : <Navigation className="w-4 h-4" />}
              {t("分析并规划路线", "ANALYZE & PLAN ROUTE", "분석 및 경로 계획")}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
            <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40">{t("地图图层", "Map Overlays", "지도 레이어")}</h4>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600 flex items-center gap-2">
                <Coffee size={12} /> {t("服务图标", "Service Icons", "서비스 아이콘")}
              </span>
              <button 
                onClick={() => setShowPois(!showPois)}
                className={cn("w-8 h-4 rounded-full relative transition-colors", showPois ? "bg-[#4a5d4e]" : "bg-gray-200")}
              >
                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all", showPois ? "right-0.5" : "left-0.5")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-600/70 flex items-center gap-2">
                <AlertTriangle size={12} /> {t("危险区域", "Hazards Layer", "위험 구역")}
              </span>
              <button 
                onClick={() => setShowHazards(!showHazards)}
                className={cn("w-8 h-4 rounded-full relative transition-colors", showHazards ? "bg-[#4a5d4e]" : "bg-gray-200")}
              >
                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all", showHazards ? "right-0.5" : "left-0.5")} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Seasonal sidebar removed as per request */}
    </>
  );
}
