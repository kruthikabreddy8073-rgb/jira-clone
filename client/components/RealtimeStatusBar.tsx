"use client";

import React from "react";
import { PresenceUser, ConnectionStatus } from "@/lib/realtime";
import { Avatar, AvatarFallback } from "./ui/avatar";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: "Live",
  connecting: "Connecting…",
  disconnected: "Reconnecting…",
};

const STATUS_DOT: Record<ConnectionStatus, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500 animate-pulse",
  disconnected: "bg-red-500 animate-pulse",
};

type Props = {
  status: ConnectionStatus;
  activeUsers: PresenceUser[];
  currentUserId?: string;
};

const RealtimeStatusBar = ({ status, activeUsers, currentUserId }: Props) => {
  const others = activeUsers.filter((u) => u.userId !== currentUserId);

  return (
    <div className="flex items-center gap-3 text-xs text-[#6B778C]">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        <span>{STATUS_LABEL[status]}</span>
      </div>

      {others.length > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {others.slice(0, 5).map((u) => (
              <Avatar key={u.sessionId} className="h-6 w-6 border-2 border-white" title={u.userName}>
                <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                  {u.userName?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span>
            {others.length} other{others.length > 1 ? "s" : ""} viewing
          </span>
        </div>
      )}
    </div>
  );
};

export default RealtimeStatusBar;