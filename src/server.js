import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fetch from "node-fetch";

const fastify = Fastify({
  logger: true,
  ignoreTrailingSlash: true,
});

// Strava OAuth configuration
const STRAVA_CONFIG = {
  clientId: 168187, // Changed to number
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  tokenUrl: "https://www.strava.com/oauth/token", // Verified correct URL
};

// Keep track of processed codes to prevent replay attacks
const processedCodes = new Set();

// Register CORS
fastify.register(cors, {
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  methods: ["GET", "POST"],
  credentials: true,
});

// Basic health check endpoint
fastify.get("/", async (request, reply) => {
  fastify.log.info("Received request to /");
  return { message: "Server is running" };
});

// Handle Strava OAuth callback
fastify.post("/api/strava/callback", async (request, reply) => {  try {
    const { code } = request.body;
    
    // Debug log the entire request body
    fastify.log.info("Received request body:", JSON.stringify(request.body));
    fastify.log.info("Raw request body:", request.body);

    if (!code) {
      fastify.log.error("No code provided in request");
      return reply.status(400).send({ error: "Authorization code required" });
    }

    if (typeof code !== 'string') {
      fastify.log.error("Code is not a string:", typeof code, code);
      return reply.status(400).send({ error: "Invalid authorization code format" });
    }

    if (code.length < 10) {
      fastify.log.error("Code too short:", code.length, code);
      return reply.status(400).send({ error: "Authorization code too short" });
    }

    if (!STRAVA_CONFIG.clientSecret) {
      return reply.status(500).send({ error: "Server configuration error" });
    }

    // Log the code being processed for debugging
    fastify.log.info(
      `Processing authorization code: ${code.substring(0, 10)}...`
    );
    fastify.log.info(`Full code length: ${code.length}`);

    fastify.log.info("Starting Strava token exchange...");

    // Exchange the authorization code for tokens
    // Strava expects form data, not JSON
    const formData = new URLSearchParams();
    formData.append("client_id", String(STRAVA_CONFIG.clientId));
    formData.append("client_secret", STRAVA_CONFIG.clientSecret);
    formData.append("code", code);
    formData.append("grant_type", "authorization_code");
    formData.append("redirect_uri", "http://localhost:5173"); // Required by Strava

    const response = await fetch(STRAVA_CONFIG.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      fastify.log.error("Strava token exchange failed:", error);
      return reply.status(response.status).send({
        error: "Failed to exchange token with Strava",
        details: error,
        statusCode: response.status,
      });
    }

    const tokenData = await response.json();

    // Mark this code as processed only after successful exchange
    processedCodes.add(code);
    fastify.log.info("Token exchange successful");

    // Clean up old codes (keep set size manageable)
    if (processedCodes.size > 1000) {
      const values = Array.from(processedCodes);
      values.slice(0, 500).forEach((oldCode) => processedCodes.delete(oldCode));
    }

    // Return the token data to the client
    return reply.send(tokenData);
  } catch (error) {
    fastify.log.error("Error exchanging code for token:", error);
    reply.status(500).send({ error: "Failed to authenticate with Strava" });
  }
});

// Get user's last activity with segments
fastify.get("/api/strava/activities/last", async (request, reply) => {
  const token = request.headers.authorization?.split(" ")[1];
  if (!token) {
    reply.code(401).send({ error: "No authorization token provided" });
    return;
  }

  try {
    // First get the list of activities
    const activitiesResponse = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!activitiesResponse.ok) {
      throw new Error("Failed to fetch activities");
    }

    const activities = await activitiesResponse.json();
    if (!activities.length) {
      reply.code(404).send({ error: "No activities found" });
      return;
    }

    // Get detailed activity data including segments
    const activityResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${activities[0].id}?include_all_efforts=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!activityResponse.ok) {
      throw new Error("Failed to fetch activity details");
    }

    const activity = await activityResponse.json();
    return activity;
  } catch (error) {
    fastify.log.error(error);
    reply
      .code(500)
      .send({ error: "Failed to fetch activity data from Strava" });
  }
});

// Handle token refresh
fastify.post("/api/strava/refresh", async (request, reply) => {
  if (!request.body?.refresh_token) {
    return reply.status(400).send({ error: "No refresh token provided" });
  }

  try {
    const { refresh_token } = request.body;

    const formData = new URLSearchParams();
    formData.append("client_id", String(STRAVA_CONFIG.clientId));
    formData.append("client_secret", String(STRAVA_CONFIG.clientSecret));
    formData.append("refresh_token", refresh_token);
    formData.append("grant_type", "refresh_token");

    fastify.log.info("Attempting to refresh token");

    const response = await fetch(STRAVA_CONFIG.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      fastify.log.error(`Token refresh failed: ${errorText}`);
      throw new Error("Failed to refresh token");
    }

    const tokenData = await response.json();
    fastify.log.info("Token refreshed successfully");
    return tokenData;
  } catch (error) {
    fastify.log.error("Error refreshing token:", error);
    return reply.status(500).send({ error: "Failed to refresh token" });
  }
});

const start = async () => {
  try {
    await fastify.listen(3000);
    fastify.log.info(`Server listening on http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
