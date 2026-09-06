import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export type RealtimeEvent = {
  eventId: string;
  type:
    | "ISSUE_CREATED"
    | "ISSUE_UPDATED"
    | "ISSUE_STATUS_CHANGED"
    | "COMMENT_ADDED"
    | "ISSUE_DELETED";
  projectId: string;
  issueId: string;
  issue: any | null;
  timestamp: string;
};

export type PresenceUser = {
  sessionId: string;
  userId: string;
  userName: string;
  joinedAt: string;
};

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

type EventHandler = (event: RealtimeEvent) => void;
type PresenceHandler = (users: PresenceUser[]) => void;
type StatusHandler = (status: ConnectionStatus) => void;

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "http://localhost:8080";
const MAX_SEEN_EVENT_IDS = 300;

// Single shared connection for the whole app - one project "room" at a
// time. Re-calling connect() with the same projectId is a no-op, so
// multiple components can each call it without opening duplicate sockets.
class RealtimeClient {
  private client: Client | null = null;
  private currentProjectId: string | null = null;

  private seenEventIds = new Set<string>();
  private seenOrder: string[] = [];

  private eventHandlers = new Set<EventHandler>();
  private presenceHandlers = new Set<PresenceHandler>();
  private statusHandlers = new Set<StatusHandler>();

  private setStatus(status: ConnectionStatus) {
    this.statusHandlers.forEach((h) => h(status));
  }

  // Defends against a duplicate delivery of the same logical event -
  // e.g. a message replayed across a reconnect, or two subscribers in the
  // same tab both registering. The server already guarantees one publish
  // per mutation; this is the client-side backstop.
  private isDuplicate(eventId: string): boolean {
    if (this.seenEventIds.has(eventId)) return true;
    this.seenEventIds.add(eventId);
    this.seenOrder.push(eventId);
    if (this.seenOrder.length > MAX_SEEN_EVENT_IDS) {
      const oldest = this.seenOrder.shift();
      if (oldest) this.seenEventIds.delete(oldest);
    }
    return false;
  }

  connect(projectId: string, userId: string, userName: string) {
    if (!projectId || !userId) return;
    if (this.client && this.currentProjectId === projectId) return;

    this.disconnect();
    this.currentProjectId = projectId;
    this.setStatus("connecting");

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_BASE_URL}/ws`) as any,
      // Read by WebSocketAuthChannelInterceptor on the backend at CONNECT
      // time - a connection without a valid, existing userId is rejected
      // outright, before it can subscribe to anything.
      connectHeaders: { userId, userName: userName || "" },
      // Built-in automatic reconnect on any drop - network blip, server
      // restart, laptop sleep/wake, etc. No manual retry loop needed.
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.setStatus("connected");

        client.subscribe(`/topic/projects/${projectId}`, (message: IMessage) => {
          try {
            const event: RealtimeEvent = JSON.parse(message.body);
            if (this.isDuplicate(event.eventId)) return;
            this.eventHandlers.forEach((h) => h(event));
          } catch (e) {
            console.error("Failed to parse realtime event", e);
          }
        });

        client.subscribe(`/topic/projects/${projectId}/presence`, (message: IMessage) => {
          try {
            const users: PresenceUser[] = JSON.parse(message.body);
            this.presenceHandlers.forEach((h) => h(users));
          } catch (e) {
            console.error("Failed to parse presence payload", e);
          }
        });

        client.publish({
          destination: `/app/projects/${projectId}/join`,
          body: JSON.stringify({ userId, userName }),
        });
      },
      onWebSocketClose: () => {
        this.setStatus("disconnected");
        // stompjs will automatically retry using reconnectDelay above;
        // onConnect fires again once it succeeds, flipping status back.
      },
      onStompError: () => {
        this.setStatus("disconnected");
      },
    });

    client.activate();
    this.client = client;
  }

  disconnect() {
    if (this.client) {
      try {
        if (this.currentProjectId && this.client.connected) {
          this.client.publish({
            destination: `/app/projects/${this.currentProjectId}/leave`,
            body: "{}",
          });
        }
      } catch {
        // best-effort - the server's disconnect listener cleans up
        // presence automatically even if this explicit leave doesn't land
      }
      this.client.deactivate();
      this.client = null;
    }
    this.currentProjectId = null;
  }

  onEvent(handler: EventHandler) {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onPresence(handler: PresenceHandler) {
    this.presenceHandlers.add(handler);
    return () => this.presenceHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }
}

export const realtimeClient = new RealtimeClient();