const API_BASE_URL = "http://localhost:3000";

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

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

export interface StravaSegmentEffort {
  id: number;
  segment: StravaSegment;
  elapsed_time: number;
  moving_time: number;
  pr_rank?: number;
  achievements?: Array<{ type: string; id: number }>;
  average_heartrate?: number;
  average_watts?: number;
  max_heartrate?: number;
  start_date?: string;
  start_date_local?: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  segment_efforts: StravaSegmentEffort[];
}

export const api = {
  async refreshToken() {
    const tokenData = JSON.parse(
      localStorage.getItem("stravaTokenData") || "{}"
    ) as TokenData;
    if (!tokenData.refresh_token) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_BASE_URL}/api/strava/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: tokenData.refresh_token }),
    });

    if (!response.ok) {
      localStorage.removeItem("stravaTokenData");
      throw new Error("Failed to refresh token");
    }

    const newTokenData = await response.json();
    localStorage.setItem("stravaTokenData", JSON.stringify(newTokenData));
    return newTokenData.access_token;
  },

  async getValidToken() {
    const tokenData = JSON.parse(
      localStorage.getItem("stravaTokenData") || "{}"
    ) as TokenData;
    if (!tokenData.access_token) {
      throw new Error("No token available");
    }

    // Check if token is expired or will expire in the next 5 minutes
    const expiresAt = tokenData.expires_at * 1000; // Convert to milliseconds
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() + fiveMinutes >= expiresAt) {
      return this.refreshToken();
    }

    return tokenData.access_token;
  },

  async get(endpoint: string) {
    try {
      const token = await this.getValidToken();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
      };
      const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes("token")) {
        localStorage.removeItem("stravaTokenData");
      }
      throw error;
    }
  },

  async post<T>(endpoint: string, data: T) {
    try {
      const token = await this.getValidToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes("token")) {
        localStorage.removeItem("stravaTokenData");
      }
      throw error;
    }
  },

  async getLastActivity(): Promise<StravaActivity> {
    return this.get("/api/strava/activities/last");
  },
};
