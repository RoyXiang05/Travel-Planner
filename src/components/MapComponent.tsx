import { useEffect, useState } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  useMap 
} from "react-leaflet";
import L from "leaflet";
import { Landmark, Route, POI, LocalEvent, Venue, DrivingTip } from "../types";

// Fixing Default Icon issue in Leaflet using CDN
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to center map
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

interface MapComponentProps {
  landmarks: Landmark[];
  routes: Route[];
  pois: POI[];
  extractedVenues?: Venue[];
  drivingTips?: DrivingTip[];
  events: LocalEvent[];
  viewMode: "summer" | "winter";
  showHazards: boolean;
  showPois: boolean;
  center: [number, number];
  onSelectVenue: (venue: Venue | DrivingTip | Landmark) => void;
  selectedLang: "zh" | "en" | "ko";
  baseLocation?: {
    name: string;
    name_en?: string;
    name_ko?: string;
    lat: number;
    lng: number;
    notes?: string;
    notes_en?: string;
    notes_ko?: string;
  };
}

export default function MapComponent({
  landmarks,
  routes,
  pois,
  extractedVenues,
  drivingTips,
  events,
  viewMode,
  showHazards,
  showPois,
  center,
  onSelectVenue,
  selectedLang,
  baseLocation
}: MapComponentProps) {

  const getLocalized = (obj: any, baseField: string) => {
    if (selectedLang === "zh") return obj[baseField] || "";
    if (selectedLang === "en") return obj[`${baseField}_en`] || obj[baseField] || "";
    if (selectedLang === "ko") return obj[`${baseField}_ko`] || obj[baseField] || "";
    return obj[baseField] || "";
  };

  const getVenueIcon = (v: any) => {
    let emoji = v.emoji || "📍";
    let color = "bg-gray-500";
    const type = v.type;

    if (type === "hotel") { emoji = v.emoji || "🏨"; color = "bg-indigo-500"; }
    if (type === "restaurant") { emoji = v.emoji || "🍴"; color = "bg-rose-500"; }
    if (type === "cafe") { emoji = v.emoji || "☕"; color = "bg-amber-600"; }
    if (type === "parking") { emoji = v.emoji || "🅿️"; color = "bg-blue-600"; }
    if (type === "gas") { emoji = v.emoji || "⛽"; color = "bg-emerald-600"; }
    if (type === "attraction") { emoji = v.emoji || "🎡"; color = "bg-purple-600"; }
    if (type === "speed_trap") { emoji = v.emoji || "📸"; color = "bg-red-600 animate-pulse"; }
    if (type === "caution") { emoji = v.emoji || "⚠️"; color = "bg-amber-500 animate-bounce"; }
    if (type === "viewpoint") { emoji = v.emoji || "🔭"; color = "bg-cyan-600"; }
    if (type === "checkpoint") { emoji = v.emoji || "📍"; color = "bg-orange-500"; }
    if (type === "base") { emoji = "📌"; color = "bg-[#4a5d4e]"; }
    
    return L.divIcon({
      html: `<div class="${color} p-1 rounded-lg border-2 border-white shadow-xl flex items-center justify-center w-8 h-8 text-sm cursor-pointer">${emoji}</div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
  };

  return (
    <MapContainer 
      center={center} 
      zoom={8} 
      className="z-0"
      zoomControl={false}
    >
      {/* Natural Tones Tile Layer (CartoDB Positron) */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      {/* Routes */}
      {routes?.map((route, idx) => {
        const isBlocked = viewMode === "winter" && route.isWinterClosed;
        const routeKey = route.id || `route-${idx}-${route.name}`;
        
        // Calculate arrows at intervals
        const arrows: { pos: [number, number], rotation: number }[] = [];
        if (route.points.length > 1) {
          const interval = Math.max(1, Math.floor(route.points.length / 10)); // ~10 arrows per route
          for (let i = 0; i < route.points.length - 1; i += interval) {
            const p1 = route.points[i];
            const p2 = route.points[i + 1];
            // Simple rotation calculation (degree from x-axis)
            const angle = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]) * (180 / Math.PI);
            arrows.push({ 
              pos: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], 
              rotation: angle 
            });
          }
        }

        return (
          <div key={routeKey}>
            <Polyline
              positions={route.points}
              pathOptions={{
                color: isBlocked ? "#cbd5e1" : (route.color || "#e67e22"),
                weight: 5,
                opacity: isBlocked ? 0.4 : 0.8,
                dashArray: isBlocked ? "10, 10" : undefined,
                lineCap: "round",
                lineJoin: "round"
              }}
            >
              <Popup>
                <div className="text-sm font-sans">
                  <p className="font-bold text-[#4a5d4e]">{route.name}</p>
                  {isBlocked && <p className="text-amber-700 text-xs mt-1">⚠️ Winter Closure</p>}
                </div>
              </Popup>
            </Polyline>
            {!isBlocked && arrows.map((arrow, aidx) => (
              <Marker
                key={`arrow-${routeKey}-${aidx}`}
                position={arrow.pos}
                icon={L.divIcon({
                  html: `<div style="transform: rotate(${-arrow.rotation}deg); color: ${route.color || '#e67e22'}; font-size: 14px; display: flex; align-items: center; justify-content: center;">➤</div>`,
                  className: "",
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })}
              />
            ))}
          </div>
        );
      })}

      {/* Base Location Marker */}
      {baseLocation && (
        <Marker 
          position={[baseLocation.lat, baseLocation.lng]}
          icon={getVenueIcon({ type: 'base' })}
          zIndexOffset={1000}
        >
          <Popup>
            <div className="p-1">
              <h3 className="font-bold text-[#4a5d4e]">
                {selectedLang === 'zh' ? '起点' : selectedLang === 'ko' ? '기점' : 'Base'}: {getLocalized(baseLocation, 'name')}
              </h3>
              {getLocalized(baseLocation, 'notes') && <p className="text-xs mt-1 text-gray-500">{getLocalized(baseLocation, 'notes')}</p>}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Landmarks */}
      {landmarks?.map((landmark, idx) => {
        const markerKey = landmark.id || `landmark-${idx}-${landmark.lat}-${landmark.lng}`;
        return (
          <Marker 
            key={markerKey} 
            position={[landmark.lat, landmark.lng]}
            icon={getVenueIcon(landmark)}
            eventHandlers={{
              click: () => onSelectVenue(landmark)
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold">{getLocalized(landmark, 'name')}</h3>
                <p className="text-xs text-gray-500 capitalize">{landmark.type}</p>
                {getLocalized(landmark, 'notes') && <p className="text-sm mt-1">{getLocalized(landmark, 'notes')}</p>}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* POIs */}
      {showPois && pois?.map((poi, idx) => {
        const poiKey = poi.id || `poi-${idx}-${poi.lat}-${poi.lng}`;
        return (
          <Marker 
            key={poiKey} 
            position={[poi.lat, poi.lng]}
            icon={L.divIcon({
              html: `<div class="bg-blue-500 p-1 rounded-full border border-white shadow-lg"><div class="w-2 h-2 rounded-full ${poi.status === 'open' ? 'bg-green-300' : 'bg-red-400'}"></div></div>`,
              className: "",
              iconSize: [20, 20]
            })}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{poi.name}</p>
                <p className="text-gray-500">{poi.type}</p>
                <span className={`text-xs px-2 rounded-full ${poi.status === 'open' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {poi.status}
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Extracted Venues */}
      {extractedVenues?.map((venue, idx) => (
        <Marker 
          key={`venue-${idx}`} 
          position={[venue.lat, venue.lng]}
          icon={getVenueIcon(venue)}
          eventHandlers={{
            click: () => onSelectVenue(venue)
          }}
        >
          <Popup>
            <div className="p-1 max-w-[200px]">
              <h3 className="font-bold text-[#8b5e3c]">{getLocalized(venue, 'name')}</h3>
              <p className="text-[0.625rem] uppercase font-bold text-gray-400 mb-1">{venue.type}</p>
              {venue.rating && <p className="text-xs text-amber-600 mb-1">⭐ {venue.rating}</p>}
              <p className="text-xs text-gray-600">{getLocalized(venue, 'description')}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Driving Tips / Speed Traps */}
      {showHazards && drivingTips?.map((tip, idx) => (
        <Marker 
          key={`tip-${idx}`} 
          position={[tip.lat, tip.lng]}
          icon={getVenueIcon(tip)}
          eventHandlers={{
            click: () => onSelectVenue(tip as any)
          }}
        >
          <Popup>
            <div className="p-1 max-w-[200px]">
              <h3 className="font-bold text-red-600 capitalize">{tip.type.replace("_", " ")}</h3>
              <p className="text-xs font-bold text-gray-700">{tip.location}</p>
              <p className="text-sm mt-1 text-gray-600">{getLocalized(tip, 'message')}</p>
              {tip.source && (
                <p className="text-[10px] mt-2 text-gray-400 font-bold italic">
                  {selectedLang === "zh" ? "来源: " : selectedLang === "ko" ? "출처: " : "Source: "} {tip.source}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Events */}
      {events?.map((event, idx) => {
        const eventKey = event.id || `event-${idx}-${event.name}-${event.coordinates[0]}`;
        return (
          <Marker 
            key={eventKey} 
            position={event.coordinates}
          >
            <Popup>
              <div className="max-w-xs">
                <p className="font-bold text-amber-500">{event.name}</p>
                <p className="text-xs font-mono mb-1">{event.type}</p>
                <p className="text-sm">{event.description}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
      
      <ChangeView center={center} />
    </MapContainer>
  );
}
