import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { GoogleGenAI } from "@google/genai";
import MapComponent from "./components/MapComponent";
import Controls from "./components/Controls";
import { Landmark, Route, POI, LocalEvent, RoutePlanResponse, Venue, DrivingTip, Project } from "./types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { RefreshCw, Search, ExternalLink, MapPin, Globe, Star, Compass, Utensils, X, Download, Save, History, FolderOpen, Film } from "lucide-react";
import { deserializeState, serializeState } from "./lib/urlUtils";
import Onboarding from "./components/Onboarding";
import ExportTools from "./components/ExportTools";
import ApiConfigModal from "./components/ApiConfigModal";
import { getGeminiApiKey, getGeminiErrorMessage, generateGeminiContent } from "./lib/apiKey";

// Sample Initial Routes (Georgia Military Highway etc.)
const INITIAL_ROUTES: Route[] = [];

// Sample Initial Landmarks
const INITIAL_LANDMARKS: Landmark[] = [];

export default function App() {
  const [viewMode, setViewMode] = useState<"summer" | "winter">("summer");
  const [showHazards, setShowHazards] = useState(false);
  const [showPois, setShowPois] = useState(true);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [center, setCenter] = useState<[number, number]>([41.7151, 44.8271]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [extractedVenues, setExtractedVenues] = useState<Venue[]>([]);
  const [drivingTips, setDrivingTips] = useState<DrivingTip[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<Venue | DrivingTip | Landmark | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [plannedPlan, setPlannedPlan] = useState<RoutePlanResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLang, setSelectedLang] = useState<"zh" | "en" | "ko">("zh");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // Show API Key configuration popup for the first visit
  useEffect(() => {
    const configured = localStorage.getItem("custom_api_configured");
    if (!configured) {
      const timer = setTimeout(() => {
        setIsApiModalOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Project Management State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentLinks, setCurrentLinks] = useState<string[]>([""]);

  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Load projects from local storage
  useEffect(() => {
    const saved = localStorage.getItem("georoute_projects");
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
  }, []);

  // Save projects to local storage
  useEffect(() => {
    localStorage.setItem("georoute_projects", JSON.stringify(projects));
  }, [projects]);

  // URL Sharing Hydration
  useEffect(() => {
    const dataParam = searchParams.get("data");
    if (dataParam) {
      const decoded = deserializeState(dataParam);
      if (decoded && decoded.plan) {
        setPlannedPlan(decoded.plan);
        if (decoded.lang) setSelectedLang(decoded.lang);
      }
    }
  }, [searchParams]);

  // Update URL on plan change
  useEffect(() => {
    if (plannedPlan) {
      const serialized = serializeState({ plan: plannedPlan, lang: selectedLang });
      setSearchParams({ data: serialized }, { replace: true });
    }
  }, [plannedPlan, selectedLang, setSearchParams]);

  const saveCurrentToProject = useCallback((plan: RoutePlanResponse, existingLinks: string[]) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: plan.name || "New Trip",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceLinks: existingLinks,
      plan: plan,
    };

    setProjects(prev => {
      const newList = [newProject, ...prev];
      return newList.slice(0, 5);
    });
    setCurrentProjectId(newProject.id);
  }, []);

  const loadProject = (project: Project) => {
    setPlannedPlan(project.plan);
    setCurrentProjectId(project.id);
    setCurrentLinks(project.sourceLinks || [""]);
    setIsItineraryOpen(true);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProjectId === id) setCurrentProjectId(null);
  };

  // Sync POI status on load (PRD 3.4)
  useEffect(() => {
    const fetchPois = async () => {
      try {
        const res = await fetch("/api/poi/status");
        if (res.ok) {
          // const data = await res.json();
          // Silently sync
        }
      } catch (err) {
        // Silently fail to avoid console clutter
      }
    };
    fetchPois();
  }, []);

  useEffect(() => {
    if (plannedPlan) {
      setItineraryY(0);
      setIsItineraryOpen(true);
    }
  }, [plannedPlan]);

  const [itineraryY, setItineraryY] = useState(0);

  const localizedContent = useMemo(() => {
    if (!plannedPlan) return null;
    const isZh = selectedLang === "zh";
    const isEn = selectedLang === "en";
    const isKo = selectedLang === "ko";

    const filterByDay = (items: any[]) => {
      if (selectedDay === null) return items;
      return items.filter(item => item.day === selectedDay);
    };

    return {
      title: isZh ? plannedPlan.name : (isEn ? (plannedPlan.name_en || plannedPlan.name) : (plannedPlan.name_ko || plannedPlan.name)),
      summary: isZh ? (plannedPlan.summary || "") : (isEn ? (plannedPlan.summary_en || plannedPlan.summary || "") : (plannedPlan.summary_ko || plannedPlan.summary || "")),
      baseLocation: plannedPlan.baseLocation,
      baseLocationName: isZh ? plannedPlan.baseLocation?.name : (isEn ? (plannedPlan.baseLocation?.name_en || plannedPlan.baseLocation?.name) : (plannedPlan.baseLocation?.name_ko || plannedPlan.baseLocation?.name)),
      landmarks: filterByDay(plannedPlan.checkpoints || []).map(cp => ({
        ...cp,
        displayName: isZh ? cp.name : (isEn ? (cp.name_en || cp.name) : (cp.name_ko || cp.name)),
        displayNotes: isZh ? cp.notes : (isEn ? (cp.notes_en || cp.notes) : (cp.notes_ko || cp.notes))
      })),
      restaurants: filterByDay(plannedPlan.venues || []).filter(v => v.type === 'restaurant').map(r => ({
        ...r,
        displayName: isZh ? r.name : (isEn ? (r.name_en || r.name) : (r.name_ko || r.name)),
        displayDesc: isZh ? r.description : (isEn ? (r.description_en || r.description) : (r.description_ko || r.description))
      })),
      hotels: filterByDay(plannedPlan.venues || []).filter(v => v.type === 'hotel').map(h => ({
        ...h,
        displayName: isZh ? h.name : (isEn ? (h.name_en || h.name) : (h.name_ko || h.name)),
        displayDesc: isZh ? h.description : (isEn ? (h.description_en || h.description) : (h.description_ko || h.description))
      }))
    };
  }, [plannedPlan, selectedLang, selectedDay]);

  // Road-following route fetcher
  const fetchRoadRoute = async (points: [number, number][]): Promise<[number, number][]> => {
    if (points.length < 2) return points;
    // OSRM coordinates are comma-separated lon,lat pairs, and segments are semicolon-separated.
    const coordsString = points.map(p => `${p[1]},${p[0]}`).join(";");
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        // OSRM returns coordinates as [lng, lat], convert back to [lat, lng]
        return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
      }
    } catch (e) {
      console.error("OSRM Routing failed", e);
    }
    return points;
  };

  // Haversine distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handlePlanRoute = async (links: string[], demands: string, destination: string, baseLocationStr: string) => {
    if (links.length === 0 && !demands.trim()) {
      toast.info("Please provide links or specific travel demands.");
      return;
    }
    setIsProcessing(true);
    setLandmarks([]);
    setRoutes([]);
    setSelectedDay(null);
    setExtractedVenues([]);
    setDrivingTips([]);
    setPlannedPlan(null);
    try {
      const region = destination || "Georgia";
      const prompt = `You are a World-Class Travel Intelligence AI. 

        GOAL: Perform a 100% LOSSLESS extraction from provided social media notes/links (TEXT and VIDEO) and organize into a daily itinerary.
        
        STRICT LOCALIZATION RULE: 
        1. YOU MUST NEVER MIX LANGUAGES. 
        2. If a field ends in "_en", it MUST be 100% English.
        3. If a field ends in "_ko", it MUST be 100% Korean.
        4. If a field has no suffix, it MUST be 100% Chinese (Simplified).
        5. Translate ALL place names, descriptions, and warnings fully into each language.

        INPUT DATA:
        SOURCES:
        ${links.map((l, i) => `[${i + 1}]: ${l}`).join("\n")}
        
        ADDITIONAL CONTEXT & REQUIREMENTS:
        ${demands}

        BASE LOCATION/START POINT: ${baseLocationStr || "Not provided"}

        STRICT EXECUTION LOGIC:
        1. MULTI-MODAL ANALYSIS: If a source is a VIDEO link (e.g., YouTube), analyze its content, transcript (if reachable), and visual descriptions to extract route details.
        2. LOCALIZATION: You MUST provide "summary", "summary_en", and "summary_ko".
        3. ATTRIBUTION: For any "drivingTips" (warnings like ⚠️Road Warning, ⛰️Steep), you MUST include a "source" field indicating which link index ([1], [2]...) it came from. IF NOT IN SOURCE, DO NOT ADD.
        4. ORGANIZATION: Assign each checkpoint to a "day" based on optimal regional flow.
        5. BASE LOCATION: Each day's route MUST start/end at this base location.
        6. TRANSPORT: Provide transport recommendations FROM the base location to each point.
        7. IMAGES: For "image" field, provide specific descriptive keywords for high-res travel photography.

        JSON SCHEMA:
        {
          "name": "Route Name", "name_en": "EN", "name_ko": "KO",
          "author": "extracted handle/account name from source, e.g. 'TravelerJoe'",
          "summary": "ZH Summary", "summary_en": "EN Summary", "summary_ko": "KO Summary",
          "baseLocation": { "name": "Base Name", "name_en": "EN", "name_ko": "KO", "lat": number, "lng": number, "notes": "ZH notes", "notes_en": "EN", "notes_ko": "KO" },
          "checkpoints": [
            { 
              "name": "Name", "name_en": "EN", "name_ko": "KO", "type": "checkpoint" | "viewpoint", 
              "day": number, "lat": number, "lng": number, 
              "notes": "ZH", "notes_en": "EN", "notes_ko": "KO",
              "transport_recommendation": "ZH", "transport_recommendation_en": "EN", "transport_recommendation_ko": "KO",
              "image": "keywords", "emoji": "string"
            }
          ],
          "venues": [
            { 
              "name": string, "name_en": "EN", "name_ko": "KO", "type": "restaurant" | "hotel" | "cafe", "lat": number, "lng": number, 
              "day": number, "description": "ZH", "description_en": "EN", "description_ko": "KO", "image": "keywords", "emoji": "string"
            }
          ],
          "drivingTips": [
            { "type": "⚠️Road Warning" | "⛰️Gradient", "message": "string", "message_en": "EN", "message_ko": "KO", "lat": number, "lng": number, "source": "Link [N]" }
          ]
        }
        
        Respond ONLY with the JSON string.`;

      const response = await generateGeminiContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty AI response");

      let cleaned = responseText.trim();
      const startIdx = cleaned.indexOf("{");
      const endIdx = cleaned.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      } else {
        cleaned = cleaned.replace(/```json|```/g, "");
      }
      const plan: RoutePlanResponse = JSON.parse(cleaned);
      
      if (plan && Array.isArray(plan.checkpoints)) {
        const processedCP = plan.checkpoints.map((cp: any, idx: number) => ({
          ...cp,
          id: cp.id || `plan-cp-${Date.now()}-${idx}`
        }));
        
        setLandmarks(processedCP);
        setPlannedPlan({ ...plan, checkpoints: processedCP });
        if (plan.venues) setExtractedVenues(plan.venues);
        if (plan.drivingTips) setDrivingTips(plan.drivingTips);

        saveCurrentToProject({ ...plan, checkpoints: processedCP }, links);

        if (processedCP.length > 0) {
          setCenter([processedCP[0].lat, processedCP[0].lng]);
        }

        // Generate daily routes
        const dayMap = new Map<number, [number, number][]>();
        const allItems = [...processedCP, ...(plan.venues || [])];
        
        allItems.forEach(item => {
          if (item.day) {
            if (!dayMap.has(item.day)) dayMap.set(item.day, []);
            dayMap.get(item.day)!.push([item.lat, item.lng]);
          }
        });

        const dayColors = ["#e67e22", "#3498db", "#2ecc71", "#9b59b6", "#f1c40f"];
        const dailyRoutes: Route[] = [];

        for (const [day, pts] of Array.from(dayMap.entries())) {
          const routePts = plan.baseLocation ? [[plan.baseLocation.lat, plan.baseLocation.lng] as [number, number], ...pts] : pts;
          const roadPoints = await fetchRoadRoute(routePts);
          dailyRoutes.push({
            id: `route-day-${day}`,
            name: `Day ${day}`,
            day: day,
            isWinterClosed: false,
            color: dayColors[(day - 1) % dayColors.length],
            points: roadPoints
          } as any);
        }

        setRoutes(dailyRoutes);
        setIsSidebarOpen(false); // Linkage: close sidebar on success
      } else {
        throw new Error("Invalid plan data received from AI.");
      }
    } catch (err) {
      console.error(err);
      const errMsg = getGeminiErrorMessage(err);
      toast.error(errMsg || "AI was unable to synthesize the route.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearchEvents = async (city: string) => {
    setIsProcessing(true);
    try {
      const prompt = `Find 3 local cultural events, festivals, or markets happening in ${city}, Georgia around ${new Date().toISOString()}. 
      Format as a JSON array of objects: [{ "name": string, "type": string, "description": string, "coordinates": [lat, lng] }]. 
      Only return the JSON.`;

      const response = await generateGeminiContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty AI response");
      
      let cleaned = responseText.trim();
      const startIdx = cleaned.indexOf("[");
      const endIdx = cleaned.lastIndexOf("]");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      } else {
        cleaned = cleaned.replace(/```json|```/g, "").trim();
      }
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        const processed = parsed.map((e: any, idx: number) => ({
          ...e,
          id: e.id || `event-${Date.now()}-${idx}`
        }));
        setEvents(processed);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error(err);
      const errMsg = getGeminiErrorMessage(err);
      toast.error(errMsg ? `Failed to fetch events: ${errMsg}` : "Failed to fetch events");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn(
      "relative w-full h-[100dvh] transition-colors duration-500 overflow-hidden font-sans",
      isDarkMode ? "bg-[#000000] text-[#FFFFFF] dark" : "bg-[#fdfaf6] text-[#2d3436]"
    )}>
      <Onboarding isDarkMode={isDarkMode} />
      <Controls 
        onOpenApiConfig={() => setIsApiModalOpen(true)}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        selectedLang={selectedLang}
        setSelectedLang={setSelectedLang}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        plannedPlan={plannedPlan}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showHazards={showHazards}
        setShowHazards={setShowHazards}
        showPois={showPois}
        setShowPois={setShowPois}
        onSearchEvents={handleSearchEvents}
        onPlanRoute={handlePlanRoute}
        isProcessing={isProcessing}
        projects={projects}
        currentProjectId={currentProjectId}
        currentLinks={currentLinks}
        setCurrentLinks={setCurrentLinks}
        onLoadProject={loadProject}
        onDeleteProject={deleteProject}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      
      <MapComponent 
        landmarks={landmarks.filter(l => selectedDay === null || l.day === selectedDay)}
        routes={routes.filter(r => selectedDay === null || (r as any).day === selectedDay)}
        pois={pois}
        extractedVenues={extractedVenues.filter(v => selectedDay === null || v.day === selectedDay)}
        drivingTips={drivingTips}
        events={events}
        viewMode={viewMode}
        showHazards={showHazards}
        showPois={showPois}
        center={center}
        onSelectVenue={setSelectedPreview}
        selectedLang={selectedLang}
        isDarkMode={isDarkMode}
        baseLocation={plannedPlan?.baseLocation}
      />

      <AnimatePresence>
        {selectedPreview && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={cn(
              "fixed bottom-24 left-4 right-4 md:bottom-auto md:top-24 md:left-auto md:right-6 md:w-80 backdrop-blur-md shadow-2xl rounded-[2rem] p-6 border z-[1050] transition-colors duration-500",
              isDarkMode 
                ? "bg-black/90 border-white/10" 
                : "bg-white/95 border-[#8b5e3c]/10"
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <span className={cn(
                  "text-[0.625rem] uppercase font-bold tracking-widest",
                  isDarkMode ? "text-white/40" : "text-gray-400"
                )}>
                  {(selectedPreview as any).type?.replace("_", " ") || "Location"}
                </span>
                <h3 className={cn(
                  "font-serif text-xl pr-6",
                  isDarkMode ? "text-white" : "text-[#8b5e3c]"
                )}>
                  {(selectedPreview as any)[selectedLang === "zh" ? "name" : (selectedLang === "en" ? "name_en" : "name_ko")] || (selectedPreview as any).name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPreview(null)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isDarkMode ? "hover:bg-white/10 text-white" : "hover:bg-[#8b5e3c]/10 text-[#8b5e3c]"
                )}
                aria-label="Close"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {plannedPlan?.baseLocation && (selectedPreview as any).lat && (selectedPreview as any).lng && (
              <div className="mb-4 p-3 bg-[#4a5d4e]/5 rounded-xl border border-[#4a5d4e]/10">
                <div className="flex justify-between items-center text-[0.625rem] uppercase font-bold text-[#4a5d4e]/70">
                  <span>{selectedLang === "zh" ? "距离起始点" : selectedLang === "ko" ? "거점까지의 거리" : "Distance to Base"}</span>
                  <span>{calculateDistance((selectedPreview as any).lat, (selectedPreview as any).lng, plannedPlan.baseLocation.lat, plannedPlan.baseLocation.lng).toFixed(1)} km</span>
                </div>
                <div className="mt-2 text-[0.625rem] text-gray-500 leading-tight text-balance">
                  <span className="font-bold">{selectedLang === "zh" ? "AI 建议:" : selectedLang === "ko" ? "AI 추천:" : "AI Recommended:"}</span> 
                  {(selectedLang === "zh" ? (selectedPreview as any).transport_recommendation : (selectedLang === "en" ? (selectedPreview as any).transport_recommendation_en : (selectedPreview as any).transport_recommendation_ko)) || (
                    selectedLang === "zh" ? "建议打车或自驾，大约需要 " : 
                    selectedLang === "ko" ? "택시나 자차를 이용하는 것이 좋으며 대략 " : 
                    "Likely taxi or private car is best, travel time "
                  ) + Math.round(calculateDistance((selectedPreview as any).lat, (selectedPreview as any).lng, plannedPlan.baseLocation.lat, plannedPlan.baseLocation.lng) * 1.5) + (
                    selectedLang === "zh" ? " 分钟。" : 
                    selectedLang === "ko" ? "분 소요됩니다." : 
                    " mins."
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar text-balance">
              {(selectedPreview as Venue).rating && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-amber-500">⭐ {(selectedPreview as Venue).rating}</span>
                  <span className="text-xs text-gray-400">/ 5.0</span>
                  <span className="mx-2 text-gray-200">|</span>
                  <span className="text-xs font-bold text-emerald-600">{(selectedPreview as Venue).priceRange || "$$"}</span>
                </div>
              )}

              <p className="text-sm text-gray-600 leading-relaxed italic text-balance">
                {(() => {
                  const p = selectedPreview as any;
                  const isCp = p.type === 'checkpoint' || p.type === 'viewpoint';
                  const isVenue = p.type === 'restaurant' || p.type === 'hotel' || p.type === 'cafe';
                  const isTip = !!p.message;

                  if (selectedLang === 'zh') return p.description || p.notes || p.message;
                  if (selectedLang === 'en') return p.description_en || p.notes_en || p.message_en || p.description || p.notes || p.message;
                  if (selectedLang === 'ko') return p.description_ko || p.notes_ko || p.message_ko || p.description || p.notes || p.message;
                  return p.description || p.notes || p.message || "No additional information available.";
                })()}
              </p>

              {(selectedPreview as any).source && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[0.625rem] font-bold text-gray-400">
                  <Film size={12} className="opacity-50" />
                  {selectedLang === "zh" ? "提取自视频/图文攻略：" : selectedLang === "ko" ? "비디오/텍스트 분석에서 추출됨:" : "Source:"} {(selectedPreview as any).source}
                </div>
              )}

              {(selectedPreview as Venue).parkingInfo && (
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                  <div className="flex justify-between items-center text-[0.625rem]">
                    <span className="font-bold text-blue-600 uppercase">Parking Details</span>
                    <span className="font-bold text-blue-800">{(selectedPreview as Venue).parkingInfo}</span>
                  </div>
                  {(selectedPreview as Venue).parkingPrice && (
                    <p className="text-xs text-blue-700 mt-1">{(selectedPreview as Venue).parkingPrice}</p>
                  )}
                </div>
              )}

              {(selectedPreview as Venue).website && (
                <a 
                  href={(selectedPreview as Venue).website} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block w-full text-center bg-[#8b5e3c]/10 text-[#8b5e3c] py-2.5 rounded-xl text-xs font-bold hover:bg-[#8b5e3c]/20 transition-colors"
                >
                  Visit Official Website
                </a>
              )}

              <button 
                onClick={() => {
                  const name = (selectedPreview as any)[selectedLang === "zh" ? "name" : (selectedLang === "en" ? "name_en" : "name_ko")] || (selectedPreview as any).name;
                  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}+${(selectedPreview as any).lat},${(selectedPreview as any).lng}`;
                  window.open(url, '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-[#8b5e3c] bg-[#8b5e3c]/5 hover:bg-[#8b5e3c]/10 transition-colors py-3 rounded-xl mt-2"
              >
                <MapPin size={14} /> {selectedLang === "zh" ? "在 Google 地图上查看" : selectedLang === "ko" ? "Google 지도에서 보기" : "View on Google Maps"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer 
        position="top-right"
        autoClose={3000}
        theme="light"
        aria-label="Notifications"
      />

      <AnimatePresence>
        {plannedPlan && (
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0, bottom: 900 }}
              dragElastic={0.05}
              initial={{ y: "100%" }}
              animate={{ y: itineraryY }}
              onDragEnd={(_, info) => {
                // Freeform hover - release and stay
                setItineraryY(prev => {
                  const currentH = window.innerHeight;
                  const newY = typeof prev === 'string' ? currentH : prev;
                  const finalY = (newY as number) + info.offset.y;
                  // Clamp between 0 and bottom
                  return Math.max(0, Math.min(finalY, currentH - 100));
                });
              }}
              transition={{ type: "spring", damping: 35, stiffness: 400 }}
              className={cn(
                "fixed bottom-0 left-0 right-0 h-[95dvh] backdrop-blur-xl rounded-t-[4rem] z-[1100] border-t flex flex-col",
                isDarkMode 
                  ? "bg-black/90 border-white/10 shadow-[0_-30px_100px_-20px_rgba(0,0,0,0.6)]" 
                  : "bg-white/40 border-white/30 shadow-[0_-30px_100px_-20px_rgba(0,0,0,0.2)]"
              )}
            >
              <div 
                className={cn(
                  "w-full pt-6 pb-6 flex flex-col items-center cursor-ns-resize shrink-0 touch-none transition-colors rounded-t-[4rem]",
                  isDarkMode ? "active:bg-white/5" : "active:bg-white/20"
                )}
              >
                <div className={cn(
                  "w-20 h-1.5 rounded-full transition-colors",
                  isDarkMode ? "bg-white/10 hover:bg-white/20" : "bg-[#2C2C2C]/10 hover:bg-[#2C2C2C]/20"
                )} />
              </div>
          
          <div id="itinerary-content" className="flex-1 overflow-y-auto px-6 md:px-12 pb-[100px] overscroll-contain touch-pan-y custom-scrollbar">
            {localizedContent && (
              <div className="max-w-6xl mx-auto space-y-8 pb-12">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className={cn(
                    "font-serif text-5xl tracking-tight mb-3 transition-colors duration-500",
                    isDarkMode ? "text-white" : "text-[#2C2C2C]"
                  )}>
                    {localizedContent.title}
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <p className={cn(
                      "text-sm font-serif tracking-wide transition-colors",
                      isDarkMode ? "text-white/40" : "text-[#8b5e3c]/60"
                    )}>
                      {selectedLang === "zh" ? "AI 多源优化合成行程" : selectedLang === "ko" ? "AI 다중 소스 최적화 합성 일정" : "AI Multi-Source Optimized Synthesis"}
                    </p>
                    <ExportTools plan={plannedPlan} lang={selectedLang} isDarkMode={isDarkMode} />
                  </div>
                </div>
              </div>

              {/* Comprehensive Summary */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "backdrop-blur-xl p-8 md:p-12 rounded-[3.5rem] border shadow-sm relative overflow-hidden transition-all duration-500",
                  isDarkMode 
                    ? "bg-white/5 border-white/10" 
                    : "bg-white/40 border-white/30"
                )}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Star size={120} fill="currentColor" className={isDarkMode ? "text-amber-200" : "text-[#4a5d4e]"} />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                      isDarkMode ? "bg-amber-200 text-black" : "bg-[#4a5d4e] text-white"
                    )}>
                       <Star size={14} fill="currentColor" />
                    </div>
                    <h3 className={cn(
                      "text-xs font-black tracking-widest uppercase transition-colors",
                      isDarkMode ? "text-amber-200" : "text-[#4a5d4e]"
                    )}>
                      {selectedLang === "zh" ? "综合总结" : (selectedLang === "en" ? "Comprehensive Summary" : "종합 요약")}
                    </h3>
                  </div>
                  <div className={cn(
                    "prose prose-sm max-w-none leading-relaxed font-serif italic whitespace-pre-wrap transition-colors",
                    isDarkMode ? "text-white/60" : "text-gray-600"
                  )}>
                    {localizedContent.summary}
                  </div>
                </div>
              </motion.div>

              {/* 2. Core Landmarks */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors",
                    isDarkMode ? "bg-amber-200/10 text-amber-200" : "bg-[#4a5d4e]/10 text-[#4a5d4e]"
                  )}>
                    2
                  </div>
                  <h3 className={cn(
                    "text-xl font-serif transition-colors",
                    isDarkMode ? "text-amber-200" : "text-[#4a5d4e]"
                  )}>
                    {selectedLang === "zh" ? "核心景点" : (selectedLang === "en" ? "Core Landmarks" : "핵심 명소")}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {localizedContent.landmarks.map((landmark, idx) => (
                    <motion.div 
                      key={landmark.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        "group backdrop-blur-xl p-4 rounded-[2.5rem] border hover:shadow-xl transition-all duration-500",
                        isDarkMode 
                          ? "bg-white/5 border-white/10 hover:bg-white/10" 
                          : "bg-white/40 border-white/30 hover:bg-white/60"
                      )}
                    >
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl shrink-0">{landmark.emoji || "📍"}</span>
                            <h4 className={cn(
                                "font-serif text-md truncate pr-2 transition-colors",
                                isDarkMode ? "text-white" : "text-[#2C2C2C]"
                            )}>{landmark.displayName}</h4>
                          </div>
                          <p className={cn(
                                "text-xs font-serif italic transition-colors",
                                isDarkMode ? "text-white/40" : "text-[#2C2C2C]/50"
                          )}>
                            {landmark.displayNotes}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {landmark.costRange && (
                              <span className={cn(
                                    "text-[0.5625rem] font-bold px-2 py-0.5 rounded-md transition-colors",
                                    isDarkMode ? "bg-amber-200/10 text-amber-200" : "bg-[#4a5d4e]/5 text-[#4a5d4e]"
                              )}>
                                💰 {landmark.costRange}
                              </span>
                            )}
                            {landmark.travelTime && (
                              <span className={cn(
                                    "text-[0.5625rem] font-bold px-2 py-0.5 rounded-md transition-colors",
                                    isDarkMode ? "bg-amber-200/10 text-amber-200" : "bg-[#4a5d4e]/5 text-[#4a5d4e]"
                              )}>
                                ⏱️ {landmark.travelTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(landmark.name)}+${landmark.lat},${landmark.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[0.5625rem] font-black tracking-tighter transition-all",
                                isDarkMode 
                                    ? "bg-white/5 border-white/10 text-white/60 hover:text-white" 
                                    : "bg-white border-gray-100 text-gray-500 hover:border-[#4a5d4e]/20"
                            )}
                          >
                            {selectedLang === "zh" ? "谷歌地图" : (selectedLang === "ko" ? "Google 지도" : "GMAPS")} <ExternalLink size={8} />
                          </a>
                          {landmark.website && (
                            <a 
                              href={landmark.website}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[0.5625rem] font-black tracking-tighter transition-all",
                                isDarkMode 
                                    ? "bg-white/5 border-white/10 text-white/60 hover:text-white" 
                                    : "bg-white border-gray-100 text-gray-500 hover:border-[#4a5d4e]/20"
                              )}
                            >
                              {selectedLang === "zh" ? "官网" : (selectedLang === "ko" ? "웹사이트" : "WEB")} <Globe size={8} />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* 3. Recommended Restaurants */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors",
                    isDarkMode ? "bg-amber-400/10 text-amber-400" : "bg-[#8b5e3c]/10 text-[#8b5e3c]"
                  )}>
                    3
                  </div>
                  <h3 className={cn(
                    "text-xl font-serif transition-colors",
                    isDarkMode ? "text-amber-200" : "text-[#4a5d4e]"
                  )}>
                    {selectedLang === "zh" ? "推荐餐厅" : (selectedLang === "en" ? "Recommended Restaurants" : "추천 레스토랑")}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {localizedContent.restaurants.map((venue, idx) => (
                    <motion.div 
                      key={venue.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        "group backdrop-blur-xl p-4 rounded-[2.5rem] border hover:shadow-xl transition-all duration-500",
                        isDarkMode 
                          ? "bg-white/5 border-white/10 hover:bg-white/10" 
                          : "bg-white/40 border-white/30 hover:bg-white/60"
                      )}
                    >
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="text-xl shrink-0">{venue.emoji || "🍴"}</span>
                              <h4 className={cn(
                                "font-serif text-md truncate transition-colors",
                                isDarkMode ? "text-amber-200" : "text-[#8b5e3c]"
                              )}>{venue.displayName}</h4>
                            </div>
                            <span className="text-[0.625rem] font-bold text-[#e67e22] shrink-0">★ {venue.rating || "4.8"}</span>
                          </div>
                          <p className={cn(
                            "text-xs font-serif italic transition-colors",
                            isDarkMode ? "text-white/40" : "text-[#2C2C2C]/50"
                          )}>
                            {venue.displayDesc}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {venue.costRange && (
                              <span className={cn(
                                "text-[0.5625rem] font-bold px-2 py-0.5 rounded-md transition-colors",
                                isDarkMode ? "bg-amber-400/10 text-amber-400" : "bg-[#8b5e3c]/5 text-[#8b5e3c]"
                              )}>
                                💰 {venue.costRange}
                              </span>
                            )}
                            {venue.travelTime && (
                              <span className={cn(
                                "text-[0.5625rem] font-bold px-2 py-0.5 rounded-md transition-colors",
                                isDarkMode ? "bg-amber-400/10 text-amber-400" : "bg-[#8b5e3c]/5 text-[#8b5e3c]"
                              )}>
                                ⏱️ {venue.travelTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                           <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}+${venue.lat},${venue.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[0.5625rem] font-black tracking-tighter text-gray-500 hover:border-[#8b5e3c]/20"
                           >
                            {selectedLang === "zh" ? "谷歌地图" : (selectedLang === "ko" ? "Google 지도" : "GMAPS")} <ExternalLink size={8} />
                           </a>
                           {venue.website && (
                             <a 
                              href={venue.website}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[0.5625rem] font-black tracking-tighter text-gray-500 hover:border-[#8b5e3c]/20"
                             >
                              {selectedLang === "zh" ? "官网" : (selectedLang === "ko" ? "웹사이트" : "WEB")} <Globe size={8} />
                             </a>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {localizedContent.restaurants.length === 0 && (
                    <div className={cn(
                      "col-span-full py-6 text-center border-2 border-dashed rounded-[2.5rem] transition-colors",
                      isDarkMode ? "border-white/10 text-white/20" : "border-gray-100 text-gray-400"
                    )}>
                      <p className="text-sm italic">
                        {selectedLang === "zh" ? "尚未从这些来源提取到特定餐厅。" : (selectedLang === "ko" ? "아직 이 소스에서 추출된 레스토랑이 없습니다." : "No specific restaurants extracted from these sources yet.")}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* 4. Recommended Hotels */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors",
                    isDarkMode ? "bg-indigo-400/10 text-indigo-400" : "bg-indigo-100 text-indigo-600"
                  )}>
                    4
                  </div>
                  <h3 className={cn(
                    "text-xl font-serif transition-colors",
                    isDarkMode ? "text-amber-200" : "text-[#4a5d4e]"
                  )}>
                    {selectedLang === "zh" ? "推荐住宿" : (selectedLang === "en" ? "Recommended Hotels" : "추천 숙소")}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {localizedContent.hotels.map((venue, idx) => (
                    <motion.div 
                      key={venue.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        "group backdrop-blur-xl p-4 rounded-[2.5rem] border hover:shadow-xl transition-all duration-500",
                        isDarkMode 
                          ? "bg-white/5 border-white/10 hover:bg-white/10" 
                          : "bg-white/40 border-white/30 hover:bg-white/60"
                      )}
                    >
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="text-xl shrink-0">{venue.emoji || "🏨"}</span>
                              <h4 className={cn(
                                "font-serif text-md truncate transition-colors",
                                isDarkMode ? "text-amber-200" : "text-[#8b5e3c]"
                              )}>{venue.displayName}</h4>
                            </div>
                            <span className="text-[0.625rem] font-bold text-indigo-500 shrink-0">★ {venue.rating || "4.9"}</span>
                          </div>
                          <p className={cn(
                            "text-xs font-serif italic transition-colors",
                            isDarkMode ? "text-white/40" : "text-[#2C2C2C]/50"
                          )}>
                            {venue.displayDesc}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                           <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}+${venue.lat},${venue.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[0.5625rem] font-black tracking-tighter transition-all",
                                isDarkMode 
                                    ? "bg-white/5 border-white/10 text-white/60 hover:text-white" 
                                    : "bg-white border-gray-100 text-gray-500 hover:border-[#8b5e3c]/20"
                            )}
                           >
                            {selectedLang === "zh" ? "谷歌地图" : (selectedLang === "ko" ? "Google 지도" : "GMAPS")} <ExternalLink size={8} />
                           </a>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {localizedContent.hotels.length === 0 && (
                    <div className={cn(
                        "col-span-full py-6 text-center border-2 border-dashed rounded-[2.5rem] transition-colors",
                        isDarkMode ? "border-white/10 text-white/20" : "border-gray-100 text-gray-400"
                    )}>
                      <p className="text-sm italic">
                        {selectedLang === "zh" ? "尚未从这些来源提取到特定住宿。" : (selectedLang === "ko" ? "아직 이 소스에서 추출된 숙소가 없습니다." : "No specific hotels extracted from these sources yet.")}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Status */}
      <div className="fixed top-24 right-28 z-[1000] flex flex-col items-end gap-2 pr-4">
        <AnimatePresence>
          {viewMode === "winter" && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={cn(
                "px-4 py-2 rounded-full border text-[0.625rem] font-bold tracking-widest shadow-xl flex items-center gap-2 transition-all duration-500",
                isDarkMode 
                  ? "bg-white/10 text-white border-white/20 shadow-black/40" 
                  : "bg-[#4a5d4e] text-white border-white/20 shadow-xl"
              )}
            >
              ❄️ {selectedLang === "zh" ? "冬季协议已激活" : (selectedLang === "ko" ? "겨울 프로토콜 활성화됨" : "WINTER PROTOCOL ACTIVE")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Liquid Effect Filter Definitions */}
      <svg className="hidden" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <ApiConfigModal 
        isOpen={isApiModalOpen} 
        onClose={() => setIsApiModalOpen(false)} 
        selectedLang={selectedLang} 
        isDarkMode={isDarkMode} 
      />
    </div>
  );
}
