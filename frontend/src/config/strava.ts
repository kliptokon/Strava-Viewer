export const STRAVA_CONFIG = {
  clientId: 168187, // as number to match backend
  redirectUri: "http://localhost:5173", // Changed to match root URL
  scope: "read,activity:read_all", // Added _all to get full access to activities
  authUrl: "https://www.strava.com/oauth/authorize",
};
