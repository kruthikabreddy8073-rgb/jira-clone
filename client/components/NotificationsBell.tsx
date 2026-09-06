"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";

const NotificationsBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user?.id) return;
    try {
      const res = await axiosInstance.get(`/api/notifications/user/${user.id}`);
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    try {
      await axiosInstance.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded hover:bg-[#EBECF0]"
        title="Notifications"
      >
        <Bell className="h-4 w-4 text-[#42526E]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 z-50 w-80 max-h-96 overflow-y-auto rounded-md border border-[#DFE1E6] bg-white shadow-lg">
          <div className="border-b px-3 py-2 text-xs font-bold uppercase text-[#6B778C]">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[#6B778C] italic">
              No notifications yet
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`border-b px-3 py-2 text-sm cursor-pointer ${
                    n.read ? "bg-white" : "bg-[#DEEBFF]"
                  } hover:bg-[#EBECF0]`}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <p className="text-[#172B4D]">{n.message}</p>
                  <p className="text-[11px] text-[#6B778C] mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;