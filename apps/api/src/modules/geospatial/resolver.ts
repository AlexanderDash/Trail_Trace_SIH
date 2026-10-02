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
  "kolkata": { city: "Kolkata", latitude: 22.5726, longitude: 88.3639 },
  "jaipur": { city: "Jaipur", latitude: 26.9124, longitude: 75.7873 },
  "ahmedabad": { city: "Ahmedabad", latitude: 23.0225, longitude: 72.5714 },
  "mewat": { city: "Mewat", latitude: 28.0069, longitude: 77.0195 },
  "lucknow": { city: "Lucknow", latitude: 26.8467, longitude: 80.9462 },
  "patna": { city: "Patna", latitude: 25.5941, longitude: 85.1376 },
  "bhubaneswar": { city: "Bhubaneswar", latitude: 20.2961, longitude: 85.8245 },
  "nagpur": { city: "Nagpur", latitude: 21.1458, longitude: 79.0882 },
  "surat": { city: "Surat", latitude: 21.1702, longitude: 72.8311 },
  "chennai": { city: "Chennai", latitude: 13.0827, longitude: 80.2707 },
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
