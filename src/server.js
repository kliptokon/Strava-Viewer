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
fastify.post("/api/strava/callback", async (request, reply) => {
  if (!request.body) {
    fastify.log.error("No request body provided");
    return reply.status(400).send({ error: "No request body provided" });
  }
  try {
    const { code } = request.body;

    if (!code) {
      fastify.log.error("No code provided in request body");
      return reply
        .status(400)
        .send({ error: "No authorization code provided" });
    }

    if (!STRAVA_CONFIG.clientSecret) {
      fastify.log.error("No client secret configured");
      return reply.status(500).send({ error: "Server configuration error" });
    }

    fastify.log.info("Starting Strava token exchange...");
    fastify.log.info(`Auth code: ${code.substring(0, 5)}...`);

    // Import fetch dynamically since we're using the ESM version
    const { default: fetch } = await import("node-fetch");

    // Create URL-encoded form data instead of JSON
    const formData = new URLSearchParams();
    formData.append("client_id", String(STRAVA_CONFIG.clientId));
    formData.append("client_secret", String(STRAVA_CONFIG.clientSecret));
    formData.append("code", String(code));
    formData.append("grant_type", "authorization_code");

    // Debug log the request (hiding the secret)
    fastify.log.info(
      `Request params: client_id=${STRAVA_CONFIG.clientId}, code=${code.substring(0, 5)}..., grant_type=authorization_code`
    );

    fastify.log.info("Making request to Strava token endpoint");

    // Build URL with query parameters
    const params = new URLSearchParams({
      client_id: String(STRAVA_CONFIG.clientId),
      client_secret: String(STRAVA_CONFIG.clientSecret),
      code: String(code),
      grant_type: "authorization_code",
    });

    const url = `${STRAVA_CONFIG.tokenUrl}?${params}`;
    fastify.log.info(
      `Making request to URL: ${url.replace(STRAVA_CONFIG.clientSecret, "****")}`
    );

    // Exchange authorization code for access token
    const tokenResponse = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      fastify.log.error(
        `Strava token exchange failed with status ${tokenResponse.status}: ${errorText}`
      );
      fastify.log.error(`Request URL was: ${STRAVA_CONFIG.tokenUrl}`);
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    fastify.log.info("Successfully obtained token");
    return tokenData;
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
