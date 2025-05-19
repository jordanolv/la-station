/**
 * Types pour les serveurs et leurs fonctionnalités
 */

export interface ServerInfo {
  id: string;
  name: string;
  icon?: string | null;
  botGuildInfo?: {
    icon?: string;
    memberCount?: number;
  };
  features?: Record<string, ServerFeature>;
  registeredAt?: string;
  config?: any;
  success?: boolean;
  error?: string;
}

export interface ServerFeature {
  enabled: boolean;
  name?: string;
  [key: string]: any;
}

export interface Feature {
  name: string;
  serverId: string;
  enabled: boolean;
  [key: string]: any;
}

export interface Channel {
  id: string;
  name: string;
  type: string;
}

export interface BotGuildsResponse {
  guildIds: string[];
  guilds: { id: string; name: string }[];
  isConnected: boolean;
  botUser?: {
    id: string;
    username: string;
    avatar?: string;
  };
  error?: string;
} 