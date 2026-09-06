"use client";

import { useEffect, useRef, useState } from "react";
import {
  realtimeClient,
  RealtimeEvent,
  PresenceUser,
  ConnectionStatus,
} from "@/lib/realtime";

export function useRealtimeProject(
  projectId: string | undefined,
  userId: string | undefined,
  userName: string | undefined,
  onEvent: (event: RealtimeEvent) => void
) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!projectId || !userId) return;

    const unsubEvent = realtimeClient.onEvent((e) => onEventRef.current(e));
    const unsubPresence = realtimeClient.onPresence(setActiveUsers);
    const unsubStatus = realtimeClient.onStatus(setStatus);

    realtimeClient.connect(projectId, userId, userName || "Unknown");

    return () => {
      unsubEvent();
      unsubPresence();
      unsubStatus();
      realtimeClient.disconnect();
    };
  }, [projectId, userId, userName]);

  return { activeUsers, status };
}