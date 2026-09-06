"use client";

import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import KanbanColumn from "./KanbanColumn";
import { createPortal } from "react-dom";
import KanbanCard from "./KanbanCard";
import IssueModel from "./IssueModel";
import RealtimeStatusBar from "./RealtimeStatusBar";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import { RealtimeEvent } from "@/lib/realtime";

const STATUS_COLUMNS = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Done" },
];

const KanbanBoard = () => {
  const { selectedProject, user } = useAuth();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  const [issues, setIssues] = useState<any[]>([]);
  const [activeIssue, setActiveIssue] = useState<any | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchIssues = async () => {
    if (!selectedProject?.id) return;

    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/issues/project/${selectedProject.id}`
      );
      setIssues(res.data);
    } catch (err) {
      console.error("Failed to load issues", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [selectedProject?.id]);

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      if (!selectedProject || event.projectId !== selectedProject.id) return;

      setIssues((prev) => {
        if (event.type === "ISSUE_DELETED") {
          return prev.filter((i) => i.id !== event.issueId);
        }
        if (!event.issue) return prev;

        const exists = prev.some((i) => i.id === event.issue.id);
        if (exists) {
          return prev.map((i) => (i.id === event.issue.id ? event.issue : i));
        }
        return [...prev, event.issue];
      });

      setSelectedIssue((prev: any) =>
        prev && event.issue && prev.id === event.issue.id ? event.issue : prev
      );
    },
    [selectedProject]
  );

  const { activeUsers, status } = useRealtimeProject(
    selectedProject?.id,
    user?.id,
    user?.name,
    handleRealtimeEvent
  );

  const onDragStart = (event: DragStartEvent) => {
    const issue = issues.find((i) => i.id === event.active.id);
    setActiveIssue(issue || null);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveIssue(null);

    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    let newStatus = over.id as string;
     const STATUS_IDS = STATUS_COLUMNS.map((c) => c.id);
  if (!STATUS_IDS.includes(newStatus)) {
     const overIssue = issues.find((i) => i.id === newStatus);
    if (!overIssue) return;
      newStatus = overIssue.status;
   }

    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.status === newStatus) return;

    const updatedIssue = {
      ...issue,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? updatedIssue : i))
      );

      await axiosInstance.put(`/api/issues/${issueId}`, {
        title: updatedIssue.title,
        description: updatedIssue.description,
        type: updatedIssue.type,
        priority: updatedIssue.priority,
        status: updatedIssue.status,
        projectId: updatedIssue.projectId,
        reporterId: updatedIssue.reporterId,
        assigneeId: updatedIssue.assigneeId,
        sprintId: updatedIssue.sprintId ?? null,
                order: updatedIssue.order ?? 0,
        comments: updatedIssue.comments ?? [],
        dueDate: updatedIssue.dueDate ?? null,
        updatedAt: updatedIssue.updatedAt,
      });
    } catch (err: any) {
      console.error("Failed to update issue", err);
      if (err?.response?.status === 409) {
        fetchIssues();
      } else {
        setIssues((prev) => prev.map((i) => (i.id === issueId ? issue : i)));
      }
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Select a project to view the board
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center justify-end pb-2">
        <RealtimeStatusBar status={status} activeUsers={activeUsers} currentUserId={user?.id} />
      </div>

      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
          Loading board…
        </div>
      ) : (
        <div className="flex h-full gap-4 pb-4">
          {STATUS_COLUMNS.map((column) => {
            const columnIssues = issues
              .filter((i) => i.status === column.id)
              .filter(
                (issue) =>
                  issue?.title?.toLowerCase().includes(searchQuery) ||
                  issue?.key?.toLowerCase().includes(searchQuery)
              )
              .sort((a, b) => a.order - b.order);

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                issues={columnIssues}
                onIssueClick={setSelectedIssue}
              />
            );
          })}
        </div>
      )}

      <IssueModel
        issue={selectedIssue}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />

      {isMounted &&
        !loading &&
        createPortal(
          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: "0.5" } },
              }),
            }}
          >
            {activeIssue ? (
              <KanbanCard issue={activeIssue} isOverlay />
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
};
export default KanbanBoard;