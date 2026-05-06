export type LandmarkType = "checkpoint" | "viewpoint" | "city";

export interface Landmark {
  id: string;
  name: string;
  type: LandmarkType;
  lat: number;
  lng: number;
  notes?: string;
  notes_en?: string;
  notes_ko?: string;
  day?: number;
  googleMapsUrl?: string;
  website?: string;
  image?: string;
  icon?: string;
  emoji?: string;
  costRange?: string;
  travelTime?: string;
  transport_recommendation?: string;
  transport_recommendation_en?: string;
  transport_recommendation_ko?: string;
}

export interface Route {
  id: string;
  name: string;
  points: [number, number][];
  isWinterClosed: boolean;
  color: string;
}

export interface POI {
  id: string;
  name: string;
  type: "toilet" | "restaurant" | "market" | "station";
  lat: number;
  lng: number;
  status: "open" | "closed" | "unknown";
}

export interface LocalEvent {
  id: string;
  name: string;
  type: string;
  description: string;
  coordinates: [number, number];
}

export interface Venue {
  id?: string;
  name: string;
  type: "hotel" | "restaurant" | "cafe" | "parking" | "gas" | "attraction";
  lat: number;
  lng: number;
  rating?: string;
  priceRange?: string;
  website?: string;
  googleMapsUrl?: string;
  image?: string;
  description?: string;
  description_en?: string;
  description_ko?: string;
  day?: number;
  costRange?: string;
  travelTime?: string;
  parkingInfo?: "free" | "paid" | "unavailable";
  parkingPrice?: string;
  transport_recommendation?: string;
  transport_recommendation_en?: string;
  transport_recommendation_ko?: string;
}

export interface DrivingTip {
  location: string;
  lat: number;
  lng: number;
  type: "speed_trap" | "caution" | "scenic" | "⚠️Road Warning" | "⛰️Gradient";
  message: string;
  message_en?: string;
  message_ko?: string;
  source?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sourceLinks: string[];
  plan: RoutePlanResponse | null;
  baseLocation?: string;
  destination?: string;
}

export interface RoutePlanResponse {
  name: string;
  name_en?: string;
  name_ko?: string;
  summary: string;
  summary_en?: string;
  summary_ko?: string;
  checkpoints: Landmark[];
  venues?: Venue[];
  drivingTips?: DrivingTip[];
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
