import { STRAVA_CONFIG } from "../config/strava";

export const stravaAuth = {
  login: () => {
    const params = new URLSearchParams({
      client_id: String(STRAVA_CONFIG.clientId),
      redirect_uri: STRAVA_CONFIG.redirectUri,
      response_type: "code",
      scope: STRAVA_CONFIG.scope,
    });

    window.location.href = `${STRAVA_CONFIG.authUrl}?${params.toString()}`;
  },

  handleCallback: async (code: string) => {
    try {
      console.log("Sending code to server:", code);
      const response = await fetch(
        "http://localhost:3000/api/strava/callback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response:", response.status, errorText);
        throw new Error(`Failed to exchange code for token: ${errorText}`);
      }

      const data = await response.json();
      console.log("Received token data:", { ...data, access_token: "***" });
      localStorage.setItem("stravaToken", data.access_token);
      return data;
    } catch (error) {
      console.error("Error in handleCallback:", error);
      throw error;
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("stravaToken");
  },

  logout: () => {
    localStorage.removeItem("stravaToken");
  },
};
