const API_BASE_URL = "http://localhost:3000";

export interface StravaSegment {
  id: number;
  name: string;
  distance: number;
  average_grade: number;
  elevation_high: number;
  elevation_low: number;
  total_elevation_gain: number;
  elapsed_time: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  segment_efforts: Array<{
    segment: StravaSegment;
    elapsed_time: number;
    moving_time: number;
  }>;
}

export const api = {
  async get(endpoint: string) {
    const token = localStorage.getItem("stravaToken");
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data: T) {
    const token = localStorage.getItem("stravaToken");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async getLastActivity(): Promise<StravaActivity> {
    return this.get("/api/strava/activities/last");
  },
};
