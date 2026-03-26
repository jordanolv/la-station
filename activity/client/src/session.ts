import { Client, type Room } from "colyseus.js";
import { discordSdk } from "./discord";
import type { UserInfo } from "./types";

export type SessionResult = {
  user: UserInfo;
  room: Room;
};

const INIT_TIMEOUT_MS = 90_000;

let sessionPromise: Promise<SessionResult> | null = null;

export function resetSession(): void {
  sessionPromise = null;
}

export function humanizeDiscordErrorMessage(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("rate limit") ||
    lower.includes("too many token") ||
    lower.includes("slow down")
  ) {
    return (
      "Discord limite temporairement les échanges de token OAuth (trop de tentatives sur ton IP ou ton appli). " +
      "Attends 15 à 60 minutes sans cliquer sur « Réessayer » ni recharger l’activité en boucle. " +
      "En dev, chaque essai compte : ferme l’activité, fais une pause, puis réessaie."
    );
  }
  return text;
}

function withInitTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(
          "Délai dépassé (Discord ou le serveur ne répond pas). Ferme l’activité complètement puis réouvre-la, ou vérifie le tunnel et le serveur.",
        ),
      );
    }, INIT_TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function getColyseusEndpoint(): string {
  const explicit = (import.meta.env.VITE_COLYSEUS_URL as string | undefined)?.trim();
  if (explicit) {
    return explicit;
  }
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/.proxy`;
}

export function getSessionOnce(): Promise<SessionResult> {
  if (!sessionPromise) {
    sessionPromise = withInitTimeout(runSession()).catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

async function runSession(): Promise<SessionResult> {
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID as string,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds"],
  });

  const tokenRes = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const tokenBody = (await tokenRes.json().catch(() => ({}))) as {
    error?: string;
    access_token?: string;
    details?: unknown;
  };

  if (!tokenRes.ok) {
    const msg =
      typeof tokenBody.error === "string" && tokenBody.error.length > 0
        ? tokenBody.error
        : `Échange de token échoué (${tokenRes.status})`;
    throw new Error(humanizeDiscordErrorMessage(msg));
  }

  const access_token = tokenBody.access_token;
  if (!access_token) {
    throw new Error("Réponse token sans access_token");
  }

  const auth = await discordSdk.commands.authenticate({ access_token });
  const discordUser = auth.user;

  const user: UserInfo = {
    id: discordUser.id,
    username: discordUser.username,
    globalName: discordUser.global_name ?? null,
    avatar: discordUser.avatar ?? null,
    avatarUrl: discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator ?? "0") % 5}.png`,
  };

  const colyseusEndpoint = getColyseusEndpoint();
  const colyseusClient = new Client(colyseusEndpoint);
  const { channelId } = discordSdk;

  const room = await colyseusClient.joinOrCreate("marble_room", {
    channelId,
    userId: user.id,
    username: user.globalName ?? user.username,
    avatarUrl: user.avatarUrl,
  });

  return { user, room };
}
