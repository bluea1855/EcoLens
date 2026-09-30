import { queryOptions } from "@tanstack/react-query";

export type PollutionReading = {
  label: string;
  value: number;
  unit: string;
};

export type EnvironmentalSnapshot = {
  location: string;
  aqi: number;
  airStatus: string;
  pm25: number;
  pm10: number;
  pollutants: PollutionReading[];
  footprint: number;
  footprintChange: number;
  categories: { name: string; value: number }[];
  pmHistory: number[];
  pmForecast: number[];
  monthlyHistory: number[];
};

const API_BASE_URL = typeof window !== "undefined" && (window as any).VITE_API_BASE_URL
  ? (window as any).VITE_API_BASE_URL
  : "http://localhost:8000/api/v1";

const defaultSnapshot: EnvironmentalSnapshot = {
  location: "Bhopal, India",
  aqi: 142,
  airStatus: "Poor",
  pm25: 78,
  pm10: 121,
  pollutants: [
    { label: "NO₂", value: 34, unit: "µg/m³" },
    { label: "O₃", value: 27, unit: "µg/m³" },
    { label: "SO₂", value: 12, unit: "µg/m³" },
    { label: "CO", value: 0.8, unit: "mg/m³" },
  ],
  footprint: 186,
  footprintChange: 8.4,
  categories: [
    { name: "Transport", value: 72 },
    { name: "Electricity", value: 48 },
    { name: "Food", value: 34 },
    { name: "Travel", value: 21 },
    { name: "Other", value: 11 },
  ],
  pmHistory: [47, 43, 49, 54, 51, 59, 57, 64, 60, 68, 73, 69, 76, 71, 78],
  pmForecast: [78, 80, 82, 89, 91, 88, 84],
  monthlyHistory: [231, 219, 248, 212, 203, 186],
};

export const ecoLensService = {
  async getSnapshot(location: string = "Bhopal, India"): Promise<EnvironmentalSnapshot> {
    try {
      const [airRes, historyRes, forecastRes, footprintRes] = await Promise.all([
        fetch(`${API_BASE_URL}/air/current?location=${encodeURIComponent(location)}`),
        fetch(`${API_BASE_URL}/air/history?location=${encodeURIComponent(location)}`),
        fetch(`${API_BASE_URL}/air/forecast?location=${encodeURIComponent(location)}`),
        fetch(`${API_BASE_URL}/footprint`)
      ]);

      if (airRes.ok && historyRes.ok && forecastRes.ok && footprintRes.ok) {
        const air = await airRes.json();
        const history = await historyRes.json();
        const forecast = await forecastRes.json();
        const footprint = await footprintRes.json();

        return {
          location: air.location || location,
          aqi: air.aqi,
          airStatus: air.airStatus,
          pm25: air.pm25,
          pm10: air.pm10,
          pollutants: air.pollutants,
          footprint: footprint.footprint,
          footprintChange: footprint.footprintChange,
          categories: footprint.categories,
          pmHistory: history.pmHistory,
          pmForecast: forecast.forecast_curve || [air.pm25, forecast.predicted_pm25_ugm3_t6],
          monthlyHistory: footprint.monthlyHistory
        };
      }
    } catch (e) {
      console.warn("Backend API unavailable, using local client fallback", e);
    }
    return { ...defaultSnapshot, location };
  },

  async logActivity(data: { category: string; vehicle_type?: string; distance_km?: number; fuel_type?: string; kwh?: number; details?: string }) {
    try {
      const res = await fetch(`${API_BASE_URL}/footprint/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Failed to log activity to backend", e);
    }
    return null;
  },

  async getAiReply(prompt: string, location: string = "Bhopal, India"): Promise<string> {
    try {
      const res = await fetch(`${API_BASE_URL}/ecopilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, location })
      });
      if (res.ok) {
        const data = await res.json();
        return data.reply;
      }
    } catch (e) {
      console.warn("EcoPilot backend call failed", e);
    }

    const normalized = prompt.toLowerCase();
    if (normalized.includes("footprint") || normalized.includes("emission")) {
      return "Transport is your largest emissions source at 72 kg CO₂e this month. Replacing two short car trips each week with public transport could reduce that total by roughly 18 kg. Your overall footprint is already down 8.4% from last month.";
    }
    if (normalized.includes("tomorrow") || normalized.includes("forecast")) {
      return "The XGBoost PM2.5 6-hour forecast shows PM2.5 could reach 91 µg/m³ before easing. Check local readings before heading out.";
    }
    return "PM2.5 is currently elevated in your local area. Consider a lower-traffic route, shortening strenuous outdoor activity, and checking real-time conditions.";
  },

  async getAlerts(location: string = "Bhopal, India") {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts?location=${encodeURIComponent(location)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Alerts fetch failed", e);
    }
    return environmentalAlerts;
  }
};

export const environmentalSnapshotQuery = queryOptions({
  queryKey: ["ecolens", "snapshot"],
  queryFn: () => ecoLensService.getSnapshot(),
  staleTime: 60_000,
});

export const citySamples = [
  { name: "Bhopal, India", aqi: 142, pm25: 78, pm10: 121 },
  { name: "Delhi, India", aqi: 168, pm25: 91, pm10: 143 },
  { name: "Pune, India", aqi: 82, pm25: 34, pm10: 61 },
  { name: "Mumbai, India", aqi: 96, pm25: 41, pm10: 74 },
  { name: "Bengaluru, India", aqi: 61, pm25: 22, pm10: 43 },
  { name: "Kolkata, India", aqi: 155, pm25: 85, pm10: 130 }
];

export const environmentalAlerts = [
  { title: "PM2.5 6-hour forecast elevated", detail: "Levels may remain elevated through the evening.", time: "12 min ago", tone: "amber" },
  { title: "Your monthly footprint is lower", detail: "You are down 8.4% compared with last month.", time: "Today", tone: "teal" },
  { title: "A new environmental insight is ready", detail: "See what is shaping air quality in Bhopal.", time: "Yesterday", tone: "blue" },
];
