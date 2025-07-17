import { STRAVA_CONFIG } from "../config/strava";

export const stravaAuth = {
  login: () => {
    // Clear any previously stored code to avoid reuse
    sessionStorage.removeItem("processedCode");

    const params = new URLSearchParams({
      client_id: String(STRAVA_CONFIG.clientId),
      redirect_uri: STRAVA_CONFIG.redirectUri,
      response_type: "code",
      scope: "read,activity:read_all", // Match what Strava is returning
      approval_prompt: "auto",
    });

    window.location.href =
      "https://www.strava.com/oauth/authorize?" + params.toString();
  },

  handleCallback: async (code: string) => {
    try {
      // Check if we've already processed this code
      const processedCode = sessionStorage.getItem("processedCode");
      if (processedCode === code) {
        console.log("Reusing existing token as code was already processed");
        const existingToken = localStorage.getItem("stravaTokenData");
        if (existingToken) {
          return JSON.parse(existingToken);
        }
      }

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
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to authenticate with Strava" }));
        console.error("Server response error:", errorData);
        throw new Error(
          errorData.error || "Failed to authenticate with Strava"
        );
      }

      const data = await response.json();

      // Store the complete token data
      const tokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        token_type: data.token_type,
      };

      // Store processedCode only after successful token exchange
      sessionStorage.setItem("processedCode", code);
      localStorage.setItem("stravaTokenData", JSON.stringify(tokenData));

      return data;
    } catch (error) {
      console.error("Error in handleCallback:", error);
      throw error;
    }
  },

  isAuthenticated: () => {
    try {
      const tokenData = JSON.parse(
        localStorage.getItem("stravaTokenData") || "{}"
      );
      if (!tokenData.access_token) return false;

      // Check if token is expired
      const expiresAt = tokenData.expires_at * 1000; // Convert to milliseconds
      return Date.now() < expiresAt;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("stravaTokenData");
    sessionStorage.removeItem("processedCode");
  },
};
