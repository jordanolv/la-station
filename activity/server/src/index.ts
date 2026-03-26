import path from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { MarbleRoom } from "./rooms/MarbleRoom";

dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const PORT = parseInt(process.env.PORT ?? "2567", 10);
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ?? "";
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI ?? "";

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

app.post("/api/token", async (req, res) => {
  const { code } = req.body as { code?: string };

  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    res.status(500).json({ error: "Server missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET" });
    return;
  }

  try {
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
    });
    if (DISCORD_REDIRECT_URI) {
      params.set("redirect_uri", DISCORD_REDIRECT_URI);
    }

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const discordMsg =
        typeof data.error_description === "string"
          ? data.error_description
          : typeof data.error === "string"
            ? data.error
            : "Discord token exchange failed";
      console.error("Discord /oauth2/token:", response.status, data);
      res.status(response.status).json({ error: discordMsg, details: data });
      return;
    }

    res.json({ access_token: data.access_token as string });
  } catch (err) {
    console.error("Token exchange error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});
gameServer.define("marble_room", MarbleRoom);

app.use("/colyseus", monitor());

void gameServer.listen(PORT).then(() => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Colyseus monitor: http://localhost:${PORT}/colyseus`);
});
