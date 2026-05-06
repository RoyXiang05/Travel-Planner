import { useState, useEffect } from "react";
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
  ChevronUp,
  ChevronDown,
  X,
  Clock,
  History,
  Trash2,
  ExternalLink,
  Film
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Project } from "../types";

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
  projects: Project[];
  currentProjectId: string | null;
  currentLinks: string[];
  setCurrentLinks: (links: string[]) => void;
  onLoadProject: (p: Project) => void;
  onDeleteProject: (id: string, e: React.MouseEvent) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
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
  isProcessing,
  projects,
  currentProjectId,
  currentLinks,
  setCurrentLinks,
  onLoadProject,
  onDeleteProject,
  isSidebarOpen,
  setIsSidebarOpen
}: ControlsProps) {
  const [destination, setDestination] = useState("Georgia");
  const [baseLoc, setBaseLoc] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [demands, setDemands] = useState("");

  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZoneName: 'short' }));
  const [temp, setTemp] = useState(14);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZoneName: 'short' }));
      // Simulate slight temperature fluctuations (±1 degree)
      setTemp(prev => {
        const delta = Math.random() > 0.5 ? 0.1 : -0.1;
        return Number((prev + delta).toFixed(1));
      });
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const t = (zh: string, en: string, ko: string) => {
    if (selectedLang === "zh") return zh;
    if (selectedLang === "en") return en;
    return ko;
  };

  const dayCount = plannedPlan ? Math.max(...[...(plannedPlan.checkpoints || []), ...(plannedPlan.venues || [])].map(i => i.day || 0), 0) : 0;

  const addLink = () => {
    if (currentLinks.length < 5) setCurrentLinks([...currentLinks, ""]);
  };

  const handlePlan = () => {
    const combinedDemands = `
      Destination: ${destination},
      Base Location/Start Point: ${baseLoc},
      Dates: ${startDate} to ${endDate},
      User Custom Notes: ${demands}
    `;
    onPlanRoute(currentLinks.filter(l => l.trim()), combinedDemands, destination, baseLoc);
  };

  const updateLink = (index: number, val: string) => {
    const next = [...currentLinks];
    next[index] = val;
    setCurrentLinks(next);
  };

  const removeLink = (index: number) => {
    setCurrentLinks(currentLinks.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="fixed top-4 md:top-6 right-4 md:right-6 flex flex-col items-end gap-3 z-[1000]">
        <div className="flex flex-wrap justify-end gap-2 md:gap-4 min-w-0">
          {/* Day Selector */}
          {plannedPlan && (
            <div className="bg-[#F3F4F6]/95 backdrop-blur-sm p-1 rounded-full shadow-sm flex items-center border border-white/50 overflow-x-auto max-w-[80vw] no-scrollbar">
              <button
                onClick={() => setSelectedDay(null)}
                className={cn(
                  "px-5 py-2 rounded-full text-[0.625rem] font-serif font-bold transition-all whitespace-nowrap",
                  selectedDay === null ? "bg-[#4a5d4e] text-white" : "text-[#374151] hover:text-[#4a5d4e]"
                )}
              >
                {t("全行程", "All Day", "전체 일정")}
              </button>
              {Array.from({ length: dayCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i + 1)}
                  className={cn(
                    "px-5 py-2 rounded-full text-[0.625rem] font-serif font-bold transition-all whitespace-nowrap",
                    selectedDay === i + 1 ? "bg-[#4a5d4e] text-white" : "text-[#374151] hover:text-[#4a5d4e]"
                  )}
                >
                  Day {i + 1}
                </button>
              ))}
            </div>
          )}

          <div className="bg-[#F3F4F6]/95 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-sm flex items-center gap-5 border border-white/50">
            <div className="flex items-center gap-2 border-r border-[#374151]/10 pr-5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-[0.625rem] font-serif font-bold text-[#1F2937] min-w-[3ch]">{temp}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500/50" />
              <span className="text-[0.625rem] font-serif font-bold uppercase tracking-widest text-[#374151]/70">{time}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            </div>
          </div>
          
          <div className="flex bg-[#F3F4F6]/95 backdrop-blur-sm p-1 rounded-full shadow-sm border border-white/50 shrink-0 overflow-hidden relative">
            {[
              { id: "zh", label: "中文" },
              { id: "en", label: "EN" },
              { id: "ko", label: "한국어" }
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => setSelectedLang(lang.id as any)}
                className={cn(
                  "px-7 py-2.5 rounded-full text-xs font-serif font-bold transition-all whitespace-nowrap relative z-10",
                  selectedLang === lang.id 
                    ? "text-white" 
                    : "text-[#374151] hover:text-[#1F2937]"
                )}
              >
                {lang.label}
                {selectedLang === lang.id && (
                  <motion.div
                    layoutId="langHighlight"
                    className="absolute inset-0 bg-[#4a5d4e] rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Curtain Panel */}
      <div className="fixed top-0 left-4 md:left-6 z-[1010] flex justify-start pointer-events-none">
        <motion.div 
          initial={{ y: "-100%" }}
          animate={{ y: isSidebarOpen ? 0 : "-100%" }}
          transition={{ 
            type: "spring", 
            damping: 25, 
            stiffness: 120, 
            mass: 0.8,
            restDelta: 0.001
          }}
          className="relative flex flex-col pointer-events-none"
        >
          {/* Main Panel Box */}
          <div className={cn(
            "w-full max-w-lg bg-[#F3F4F6]/95 backdrop-blur-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-b-[40px] border-x border-b border-white/50 p-6 md:p-8 flex flex-col relative pointer-events-auto z-10",
            !isSidebarOpen && "shadow-none"
          )}>
            <div className="max-h-[70dvh] overflow-y-auto pr-2 custom-scrollbar space-y-8">
              <div className="grid grid-cols-1 gap-8">
                {/* Context & History */}
                <div className="space-y-6">
                  {/* Project Hub Section */}
                  {projects.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs uppercase font-serif font-bold text-[#1F2937]/50 tracking-widest">
                        <History size={10} />
                        {t("我的项目", "My Projects", "내 프로젝트")}
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                        {projects.map((project) => (
                          <motion.div
                            key={project.id}
                            layoutId={`project-${project.id}`}
                            onClick={() => onLoadProject(project)}
                            className={cn(
                              "flex-shrink-0 p-4 rounded-2xl border transition-all cursor-pointer min-w-[140px] shadow-sm",
                              currentProjectId === project.id 
                                ? "bg-[#4a5d4e] border-transparent text-white shadow-md shadow-[#4a5d4e]/20" 
                                : "bg-white border-[#374151]/5 hover:border-[#4a5d4e]/20 text-[#1F2937]"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-serif font-bold truncate mb-1">{project.name}</span>
                              <span className={cn(
                                "text-[0.5rem] font-mono",
                                currentProjectId === project.id ? "text-white/60" : "text-[#1F2937]/40"
                              )}>
                                {new Date(project.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-xs uppercase font-serif font-bold text-[#1F2937] tracking-widest">{t("目的地", "Destination", "목적지")}</label>
                    <input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder={t("你去哪里？", "Where are you going?", "어디로 가시나요?")}
                      className="w-full bg-white border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.05)] rounded-2xl px-4 py-3 text-sm placeholder:text-[#1F2937]/20 focus:outline-none focus:ring-2 focus:ring-[#4a5d4e]/10 transition-all font-serif text-[#1F2937]"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs uppercase font-serif font-bold text-[#1F2937] tracking-widest">
                        <Film size={10} />
                        {t("旅游攻略与视频链接", "Guides & Video Links", "여행 가이드 및 비디오 링크")}
                      </div>
                      {currentLinks.length < 5 && (
                        <button onClick={addLink} className="text-[0.5rem] font-serif font-bold text-[#4a5d4e] hover:underline uppercase tracking-tighter cursor-pointer">+ {t("添加", "Add", "추가")}</button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {currentLinks.map((link, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            value={link}
                            onChange={(e) => updateLink(idx, e.target.value)}
                            placeholder={t("粘贴链接 (支持 YouTube)", "Paste link (YouTube support)", "링크 붙여넣기 (YouTube 지원)")}
                            className="flex-1 bg-white border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.05)] rounded-2xl px-4 py-3 text-sm placeholder:text-[#1F2937]/20 focus:outline-none focus:ring-2 focus:ring-[#4a5d4e]/10 transition-all font-serif text-[#1F2937]"
                          />
                          {currentLinks.length > 1 && (
                            <button onClick={() => removeLink(idx)} className="text-gray-300 hover:text-red-400 transition-colors">×</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs uppercase font-serif font-bold text-[#1F2937] tracking-widest">{t("行程偏好", "Travel Preferences", "여행 취향")}</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[0.5625rem] font-serif font-bold text-[#374151]/50 tracking-wider uppercase">{t("开始日期", "START DATE", "시작일")}</span>
                        <input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-white border border-white/50 rounded-xl px-3 py-2 text-[0.75rem] outline-none font-serif text-[#1F2937]"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[0.5625rem] font-serif font-bold text-[#374151]/50 tracking-wider uppercase">{t("结束日期", "END DATE", "종료일")}</span>
                        <input 
                          type="date" 
                          value={endDate} 
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-white border border-white/50 rounded-xl px-3 py-2 text-[0.75rem] outline-none font-serif text-[#1F2937]"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-xs uppercase font-serif font-bold text-[#1F2937] tracking-widest">{t("具体要求", "Specific Requirements", "상세 요구사항")}</label>
                      <textarea
                        value={demands}
                        onChange={(e) => setDemands(e.target.value)}
                        placeholder={t("例如：过敏、对老年人方便...", "e.g. Need gluten-free, accessible for elderly...", "예: 알레르기 있음, 노약자 동반...")}
                        className="w-full bg-white border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.05)] rounded-2xl p-4 text-sm text-[#1F2937] h-24 sm:h-20 resize-none focus:outline-none focus:ring-2 focus:ring-[#4a5d4e]/10 transition-all font-serif placeholder:text-[#1F2937]/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handlePlan}
                  disabled={isProcessing}
                  className="w-full max-w-sm bg-[#4a5d4e] text-white py-4 rounded-3xl flex items-center justify-center gap-3 font-serif font-bold text-xs shadow-xl shadow-[#4a5d4e]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isProcessing ? <RefreshCw className="animate-spin w-4 h-4" /> : <Navigation className="w-4 h-4" />}
                  {t("分析并规划路线", "ANALYZE & PLAN ROUTE", "분석 및 경로 계획")}
                </button>
              </div>
            </div>


          </div>

          {/* Ribbon Trigger Button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "absolute left-8 -bottom-16 w-14 h-28 bg-[#A63D40] shadow-2xl transition-all duration-500 hover:h-32 group rounded-b-[40px] flex flex-col items-center justify-end pb-6 z-0 pointer-events-auto",
              "opacity-100 translate-y-0"
            )}
            aria-label={isSidebarOpen ? "Close panel" : "Open settings"}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-black/10" />
            <div className="flex flex-col items-center gap-1.5">
              <ChevronDown size={14} className={cn("text-white/60 transition-transform", isSidebarOpen ? "rotate-180" : "animate-bounce")} />
            </div>
          </button>
        </motion.div>
      </div>

      {/* Seasonal sidebar removed as per request */}
      {/* Hidden SVG Filter for Gooey Effect */}
      <svg className="hidden">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -15" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </>
  );
}
