import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { LobbyScene } from "./scenes/LobbyScene";
import { RaceScene } from "./scenes/RaceScene";
import { LoadingScreen } from "./components/LoadingScreen";
import { getSessionOnce, humanizeDiscordErrorMessage, resetSession } from "./session";

type AppState = "loading" | "ready" | "error";

function formatInitError(err: unknown): string {
  let out: string;
  if (err instanceof Error) {
    const m = err.message?.trim();
    const httpCode =
      "code" in err && typeof (err as { code?: unknown }).code === "number"
        ? (err as { code: number }).code
        : undefined;
    if (m) {
      out = httpCode !== undefined ? `HTTP ${httpCode}: ${m}` : m;
    } else if (httpCode !== undefined) {
      if (httpCode === 404) {
        out =
          "Échec HTTP 404 (matchmaking Colyseus). Avec Cloudflare, un seul tunnel vers Vite (5173) suffit souvent pour l’OAuth, mais les POST « /.proxy/matchmake » passent mal par le dev server. Solution : lance un 2e tunnel « cloudflared tunnel --url http://localhost:2567 », copie l’URL HTTPS affichée, et dans la racine du repo (ou activity/client) ajoute VITE_COLYSEUS_URL=cette_url puis redémarre « npm run dev » du client. Le serveur Marble doit tourner sur 2567.";
      } else {
        out = `Échec HTTP ${httpCode} (Colyseus / matchmaking). Vérifie que le serveur Marble tourne (port 2567) et le proxy / la variable VITE_COLYSEUS_URL si tu utilises un tunnel.`;
      }
    } else {
      const named = err.name && err.name !== "Error" ? err.name : null;
      if (named && named !== "ServerError") out = named;
      else if (named === "ServerError") {
        out = "Erreur serveur Colyseus (détail absent — voir la console réseau F12).";
      } else {
        const firstStack = err.stack?.split("\n")[0]?.trim();
        if (firstStack && firstStack !== "Error:") out = firstStack;
        else out = "Erreur sans message (voir la console)";
      }
    }
  } else if (typeof err === "string") {
    const t = err.trim();
    out = t || "Erreur inconnue (chaîne vide)";
  } else if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) out = o.message.trim();
    else if (typeof o.error === "string" && o.error.trim()) out = o.error.trim();
    else {
      try {
        out = JSON.stringify(err);
      } catch {
        out = String(err);
      }
    }
  } else {
    const s = String(err);
    out = s || "Erreur inconnue";
  }
  return humanizeDiscordErrorMessage(out);
}

export default function App() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [appState, setAppState] = useState<AppState>("loading");
  const [loadingMsg, setLoadingMsg] = useState("Initialisation Discord...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoadingMsg("Connexion à Discord...");
        const { user, room } = await getSessionOnce();
        if (cancelled) return;

        roomRef.current = room;

        setLoadingMsg("Lancement du jeu...");
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        if (cancelled) return;

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;

        const parent = gameRef.current;
        if (!parent) {
          throw new Error("Conteneur de jeu indisponible");
        }

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: window.innerWidth,
          height: window.innerHeight,
          parent,
          backgroundColor: "#1a1a2e",
          physics: {
            default: "matter",
            matter: {
              gravity: { x: 0, y: 1.8 },
              debug: false,
            },
          },
          scene: [LobbyScene, RaceScene],
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          callbacks: {
            postBoot: (game) => {
              game.scene.start("LobbyScene", { room, user });
            },
          },
        };

        phaserRef.current = new Phaser.Game(config);
        setAppState("ready");
      } catch (err) {
        if (cancelled) return;
        resetSession();
        console.error("Init error:", err);
        setError(formatInitError(err));
        setAppState("error");
      }
    }

    void init();

    return () => {
      cancelled = true;
      phaserRef.current?.destroy(true);
      phaserRef.current = null;
      roomRef.current?.leave();
      roomRef.current = null;
      resetSession();
    };
  }, []);

  if (appState === "error") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a2e",
          color: "#fff",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48 }}>X</div>
        <h2 style={{ fontSize: 22 }}>Erreur de connexion</h2>
        <p style={{ fontSize: 14, opacity: 0.7, maxWidth: 360 }}>{error}</p>
        <button
          onClick={() => {
            resetSession();
            window.location.reload();
          }}
          style={{
            padding: "10px 24px",
            background: "#e94560",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <>
      {appState === "loading" && <LoadingScreen message={loadingMsg} />}
      <div
        ref={gameRef}
        style={{
          width: "100%",
          height: "100%",
          display: appState === "ready" ? "block" : "none",
        }}
      />
    </>
  );
}
