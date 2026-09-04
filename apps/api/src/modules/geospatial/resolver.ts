export interface Coordinates {
  latitude: number;
  longitude: number;
  city: string;
}

// Local geocoding dictionary for the demo scenario.
// In a production system, this would be backed by a Geocoding API (e.g. Mapbox, Google Maps, OSM Nominatim)
const GEOCODING_DB: Record<string, Coordinates> = {
  "delhi": { city: "Delhi", latitude: 28.7041, longitude: 77.1025 },
  "new delhi": { city: "New Delhi", latitude: 28.6139, longitude: 77.2090 },
  "noida": { city: "Noida", latitude: 28.5355, longitude: 77.3910 },
  "ghaziabad": { city: "Ghaziabad", latitude: 28.6692, longitude: 77.4538 },
  "jamtara": { city: "Jamtara", latitude: 23.9715, longitude: 86.8016 }, // Classic phishing hub
  "deoghar": { city: "Deoghar", latitude: 24.4820, longitude: 86.6948 },
  "dhanbad": { city: "Dhanbad", latitude: 23.7957, longitude: 86.4304 },
  "ranchi": { city: "Ranchi", latitude: 23.3441, longitude: 85.3096 },
  "mumbai": { city: "Mumbai", latitude: 19.0760, longitude: 72.8777 },
  "pune": { city: "Pune", latitude: 18.5204, longitude: 73.8567 },
  "bengaluru": { city: "Bengaluru", latitude: 12.9716, longitude: 77.5946 },
  "hyderabad": { city: "Hyderabad", latitude: 17.3850, longitude: 78.4867 },
};

export class LocationResolver {
  /**
   * Resolves a city name to coordinates. 
   * Returns null if it cannot be safely resolved.
   */
  static resolve(city: string | null | undefined): Coordinates | null {
    if (!city) return null;
    
    const normalized = city.trim().toLowerCase();
    
    // Direct match
    if (GEOCODING_DB[normalized]) {
      return GEOCODING_DB[normalized];
    }

    // Fuzzy matching for demo (e.g. "Delhi NCR" -> "delhi")
    for (const key of Object.keys(GEOCODING_DB)) {
      if (normalized.includes(key)) {
        return GEOCODING_DB[key];
      }
    }

    return null;
  }
}
