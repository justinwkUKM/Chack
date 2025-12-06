// components/connection-status.tsx

"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";

type ConnectionStatus = "connected" | "connecting" | "disconnected" | "reconnecting";

interface ConnectionStatusProps {
  status: ConnectionStatus;
  retryCount?: number;
  maxRetries?: number;
  reconnectDelay?: number;
  onReconnect?: () => void;
}

export default function ConnectionStatus({
  status,
  retryCount = 0,
  maxRetries = 10,
  reconnectDelay = 0,
  onReconnect,
}: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: "Connected",
          color: "bg-green-500",
          textColor: "text-green-700 dark:text-green-300",
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800",
        };
      case "connecting":
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: "Connecting...",
          color: "bg-blue-500 animate-pulse",
          textColor: "text-blue-700 dark:text-blue-300",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      case "reconnecting":
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: `Reconnecting... (${retryCount}/${maxRetries})`,
          color: "bg-yellow-500 animate-pulse",
          textColor: "text-yellow-700 dark:text-yellow-300",
          bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
          borderColor: "border-yellow-200 dark:border-yellow-800",
        };
      case "disconnected":
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: "Disconnected",
          color: "bg-red-500",
          textColor: "text-red-700 dark:text-red-300",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-200 dark:border-red-800",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} px-3 py-2 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.icon}
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.text}
        </span>
        {status === "reconnecting" && reconnectDelay > 0 && (
          <span className={`text-xs ${config.textColor} opacity-75`}>
            (next attempt in {Math.ceil(reconnectDelay / 1000)}s)
          </span>
        )}
      </div>
      
      {status === "disconnected" && onReconnect && retryCount < maxRetries && (
        <button
          onClick={onReconnect}
          className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Reconnect
        </button>
      )}
      
      {retryCount >= maxRetries && (
        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
          Max retries reached
        </span>
      )}
    </div>
  );
}

