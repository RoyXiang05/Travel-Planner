import { useState, useEffect, useMemo } from "react";
import MapComponent from "./components/MapComponent";
import Controls from "./components/Controls";
import { Landmark, Route, POI, LocalEvent, RoutePlanResponse, Venue, DrivingTip } from "./types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { RefreshCw, Search, ExternalLink, MapPin, Globe, Star, Compass, Utensils } from "lucide-react";

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

  const [isItineraryOpen, setIsItineraryOpen] = useState(false);

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
      landmarks: filterByDay(plannedPlan.checkpoints || []).map(cp => ({
        ...cp,
        displayNotes: isZh ? cp.notes : (isEn ? (cp.notes_en || cp.notes) : (cp.notes_ko || cp.notes))
      })),
      restaurants: filterByDay(plannedPlan.venues || []).filter(v => v.type === 'restaurant').map(r => ({
        ...r,
        displayDesc: isZh ? r.description : (isEn ? (r.description_en || r.description) : (r.description_ko || r.description))
      })),
      hotels: filterByDay(plannedPlan.venues || []).filter(v => v.type === 'hotel').map(h => ({
        ...h,
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
        
        GOAL: Perform a 100% LOSSLESS extraction from provided social media notes/links and organize into a daily itinerary.
        
        INPUT DATA:
        SOURCES:
        ${links.map((l, i) => `[${i + 1}]: ${l}`).join("\n")}
        
        ADDITIONAL CONTEXT & REQUIREMENTS:
        ${demands}

        BASE LOCATION/START POINT: ${baseLocationStr || "Not provided"}

        STRICT EXECUTION LOGIC:
        1. LOCALIZATION: You MUST provide "summary", "summary_en", and "summary_ko". They must be translated correctly and completely.
        2. IMAGE SEARCH: For the "image" field, provide search keywords to find high quality photos. Pro tip: add "high resolution travel photography" to keywords.
        3. ORGANIZATION: Assign each checkpoint and venue to a "day" (1, 2, 3...) based on their geographical proximity and the destination's optimal flow.
        4. BASE LOCATION: Geocode the Base Location precisely. Each day's route MUST start and end at this base location.
        5. TRANSPORT: Provide specific transport recommendations (transport_recommendation, transport_recommendation_en, transport_recommendation_ko) from the base location to each point.
        6. EXTRACTION: No generic placeholders. Extract all specifics.

        JSON SCHEMA:
        {
          "name": "Route Name", "name_en": "EN", "name_ko": "KO",
          "summary": "ZH Summary", "summary_en": "EN Summary", "summary_ko": "KO Summary",
          "baseLocation": { "name": "Base Name", "lat": number, "lng": number, "notes": "ZH notes" },
          "checkpoints": [
            { 
              "name": "Name", "type": "checkpoint" | "viewpoint", 
              "day": number,
              "lat": number, "lng": number, 
              "notes": "ZH Notes", "notes_en": "EN Notes", "notes_ko": "KO Notes",
              "transport_recommendation": "ZH", "transport_recommendation_en": "EN", "transport_recommendation_ko": "KO",
              "image": "search_keywords",
              "emoji": "string",
              "googleMapsUrl": "url"
            }
          ],
          "venues": [
            { 
              "name": string, "type": "restaurant" | "hotel" | "cafe", "lat": number, "lng": number, 
              "day": number,
              "description": "ZH Desc", "description_en": "EN Desc", "description_ko": "KO Desc",
              "transport_recommendation": "ZH", "transport_recommendation_en": "EN", "transport_recommendation_ko": "KO",
              "image": "search_keywords",
              "emoji": "string",
              "googleMapsUrl": "url"
            }
          ],
          "drivingTips": []
        }
        
        Respond ONLY with the JSON string.`;

      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate plan");
      }

      const data = await response.json();
      const responseText = data.text;
      if (!responseText) throw new Error("Empty AI response");

      const cleaned = responseText.trim().replace(/```json|```/g, "");
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
        toast.success(`Successfully planned: ${plan.name}`);
      } else {
        throw new Error("Invalid plan data received from AI.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "AI was unable to synthesize the route.");
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

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch events");
      }

      const data = await response.json();
      const responseText = data.text;
      if (!responseText) throw new Error("Empty AI response");
      
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        const processed = parsed.map((e: any, idx: number) => ({
          ...e,
          id: e.id || `event-${Date.now()}-${idx}`
        }));
        setEvents(processed);
        if (parsed.length > 0) toast.success(`Found ${parsed.length} events in ${city}`);
        else toast.info("No events found for these dates.");
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch events");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#fdfaf6] overflow-hidden font-sans text-[#2d3436]">
      <Controls 
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
        baseLocation={plannedPlan?.baseLocation}
      />

      <AnimatePresence>
        {selectedPreview && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed top-24 right-6 w-80 bg-white/95 backdrop-blur-md shadow-2xl rounded-[2rem] p-6 border border-[#8b5e3c]/10 z-[1050]"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                  {(selectedPreview as any).type?.replace("_", " ") || "Location"}
                </span>
                <h3 className="font-serif text-xl text-[#8b5e3c]">
                  {(selectedPreview as any)[selectedLang === "zh" ? "name" : (selectedLang === "en" ? "name_en" : "name_ko")] || (selectedPreview as any).name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPreview(null)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <RefreshCw size={14} className="rotate-45" />
              </button>
            </div>

            {plannedPlan?.baseLocation && (selectedPreview as any).lat && (selectedPreview as any).lng && (
              <div className="mb-4 p-3 bg-[#4a5d4e]/5 rounded-xl border border-[#4a5d4e]/10">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[#4a5d4e]/70">
                  <span>{selectedLang === "zh" ? "距离起始点" : selectedLang === "ko" ? "거점까지의 거리" : "Distance to Base"}</span>
                  <span>{calculateDistance((selectedPreview as any).lat, (selectedPreview as any).lng, plannedPlan.baseLocation.lat, plannedPlan.baseLocation.lng).toFixed(1)} km</span>
                </div>
                <div className="mt-2 text-[10px] text-gray-500 leading-tight">
                  <span className="font-bold">{selectedLang === "zh" ? "AI 建议:" : selectedLang === "ko" ? "AI 추천:" : "AI Recommended:"}</span> 
                  {(selectedPreview as any).transport_recommendation || (
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

            {(selectedPreview as Venue).image && (
              <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 border border-gray-100">
                <img 
                  src={(selectedPreview as Venue).image} 
                  alt="venue" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="space-y-4">
              {(selectedPreview as Venue).rating && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-amber-500">⭐ {(selectedPreview as Venue).rating}</span>
                  <span className="text-xs text-gray-400">/ 5.0</span>
                  <span className="mx-2 text-gray-200">|</span>
                  <span className="text-xs font-bold text-emerald-600">{(selectedPreview as Venue).priceRange || "$$"}</span>
                </div>
              )}

              <p className="text-xs text-gray-600 leading-relaxed">
                {(selectedPreview as any)[selectedLang === "zh" ? ( (selectedPreview as any).type === 'restaurant' || (selectedPreview as any).type === 'hotel' || (selectedPreview as any).type === 'cafe' ? "description" : "notes" ) : (selectedLang === "en" ? ((selectedPreview as any).type === 'restaurant' || (selectedPreview as any).type === 'hotel' || (selectedPreview as any).type === 'cafe' ? "description_en" : "notes_en") : ((selectedPreview as any).type === 'restaurant' || (selectedPreview as any).type === 'hotel' || (selectedPreview as any).type === 'cafe' ? "description_ko" : "notes_ko"))] || (selectedPreview as any).description || (selectedPreview as any).notes || (selectedPreview as DrivingTip).message || "No additional information available."}
              </p>

              {(selectedPreview as Venue).parkingInfo && (
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                  <div className="flex justify-between items-center text-[10px]">
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
                className="w-full flex items-center justify-center gap-2 text-[10px] text-gray-400 hover:text-gray-600 transition-colors py-2"
              >
                <MapPin size={12} /> {selectedLang === "zh" ? "在 Google 地图上查看" : selectedLang === "ko" ? "Google 지도에서 보기" : "View on Google Maps"}
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
                  const newY = typeof prev === 'string' ? window.innerHeight : prev;
                  const finalY = (newY as number) + info.offset.y;
                  // Clamp between 0 and bottom
                  return Math.max(0, Math.min(finalY, window.innerHeight - 100));
                });
              }}
              transition={{ type: "spring", damping: 35, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 h-[95vh] bg-white rounded-t-[3rem] shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.15)] z-[1100] border-t border-[#4a5d4e]/10 flex flex-col"
            >
              <div 
                className="w-full pt-4 pb-4 flex flex-col items-center cursor-ns-resize shrink-0 touch-none active:bg-gray-50 transition-colors rounded-t-[3rem]"
              >
                <div className="w-16 h-1.5 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors" />
              </div>
          
          <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-[500px] overscroll-contain touch-pan-y custom-scrollbar">
            {localizedContent && (
              <div className="max-w-6xl mx-auto space-y-12 pb-48">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="font-serif text-4xl text-[#4a5d4e] tracking-tight mb-2">
                    {localizedContent.title}
                  </h2>
                  <p className="text-sm text-[#8b5e3c]/60 font-medium tracking-wide uppercase">
                    {selectedLang === "zh" ? "AI 多源优化合成行程" : selectedLang === "ko" ? "AI 다중 소스 최적화 합성 일정" : "AI Multi-Source Optimized Synthesis"}
                  </p>
                </div>
              </div>

              {/* Comprehensive Summary */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#fdfaf6] p-8 md:p-10 rounded-[3rem] border border-[#4a5d4e]/10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Star size={120} fill="currentColor" className="text-[#4a5d4e]" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#4a5d4e] flex items-center justify-center text-white text-xs font-bold">
                       <Star size={14} fill="currentColor" />
                    </div>
                    <h3 className="text-xs font-black tracking-widest text-[#4a5d4e] uppercase">
                      {selectedLang === "zh" ? "综合总结" : (selectedLang === "en" ? "Comprehensive Summary" : "종합 요약")}
                    </h3>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed font-serif italic whitespace-pre-wrap">
                    {localizedContent.summary}
                  </div>
                </div>
              </motion.div>

              {/* 2. Core Landmarks */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4a5d4e]/10 flex items-center justify-center text-[#4a5d4e] font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-serif text-[#4a5d4e]">
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
                      className="group bg-[#fdfaf6] p-4 rounded-[2.5rem] border border-[#8b5e3c]/5 hover:bg-white hover:shadow-xl transition-all duration-500"
                    >
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl shrink-0">{landmark.emoji || "📍"}</span>
                            <h4 className="font-serif text-md text-[#4a5d4e] truncate pr-2">{landmark.name}</h4>
                          </div>
                          <p className="text-xs text-gray-400">
                            {landmark.displayNotes}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {landmark.costRange && (
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-[#4a5d4e]/5 text-[#4a5d4e] rounded-md">
                                💰 {landmark.costRange}
                              </span>
                            )}
                            {landmark.travelTime && (
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-[#4a5d4e]/5 text-[#4a5d4e] rounded-md">
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[9px] font-black tracking-tighter text-gray-500 hover:border-[#4a5d4e]/20"
                          >
                            {selectedLang === "zh" ? "谷歌地图" : (selectedLang === "ko" ? "Google 지도" : "GMAPS")} <ExternalLink size={8} />
                          </a>
                          {landmark.website && (
                            <a 
                              href={landmark.website}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[9px] font-black tracking-tighter text-gray-500 hover:border-[#4a5d4e]/20"
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
                  <div className="w-8 h-8 rounded-full bg-[#8b5e3c]/10 flex items-center justify-center text-[#8b5e3c] font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-serif text-[#4a5d4e]">
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
                      className="group bg-[#fdfaf6] p-4 rounded-[2.5rem] border border-[#8b5e3c]/5 hover:bg-white hover:shadow-xl transition-all duration-500"
                    >
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="text-xl shrink-0">{venue.emoji || "🍴"}</span>
                              <h4 className="font-serif text-md text-[#8b5e3c] truncate">{venue.name}</h4>
                            </div>
                            <span className="text-[10px] font-bold text-[#e67e22] shrink-0">★ {venue.rating || "4.8"}</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {venue.displayDesc}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {venue.costRange && (
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-[#8b5e3c]/5 text-[#8b5e3c] rounded-md">
                                💰 {venue.costRange}
                              </span>
                            )}
                            {venue.travelTime && (
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-[#8b5e3c]/5 text-[#8b5e3c] rounded-md">
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[9px] font-black tracking-tighter text-gray-500 hover:border-[#8b5e3c]/20"
                           >
                            {selectedLang === "zh" ? "谷歌地图" : (selectedLang === "ko" ? "Google 지도" : "GMAPS")} <ExternalLink size={8} />
                           </a>
                           {venue.website && (
                             <a 
                              href={venue.website}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[9px] font-black tracking-tighter text-gray-500 hover:border-[#8b5e3c]/20"
                             >
                              {selectedLang === "zh" ? "官网" : (selectedLang === "ko" ? "웹사이트" : "WEB")} <Globe size={8} />
                             </a>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {localizedContent.restaurants.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                      <p className="text-sm text-gray-400 italic">
                        {selectedLang === "zh" ? "尚未从这些来源提取到特定餐厅。" : (selectedLang === "ko" ? "아직 이 소스에서 추출된 레스토랑이 없습니다." : "No specific restaurants extracted from these sources yet.")}
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
              className="bg-[#4a5d4e] text-white px-4 py-2 rounded-full border border-white/20 text-[10px] font-bold tracking-widest shadow-xl flex items-center gap-2"
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
    </div>
  );
}
