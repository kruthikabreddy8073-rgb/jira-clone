"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/Axiosinstance";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { X, Plus, CheckCircle2, Circle, Link2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

type Props = {
  issue: any;
  onIssueChanged: (updatedIssue: any) => void;
};

const SubtaskAndDependencyPanel = ({ issue, onIssueChanged }: Props) => {
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]); // tasks that block this one
  const [blocks, setBlocks] = useState<any[]>([]); // tasks this one blocks
  const [projectIssues, setProjectIssues] = useState<any[]>([]);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [selectedDependencyId, setSelectedDependencyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSubtask = Boolean(issue?.parentId);

  const loadAll = async () => {
    if (!issue?.id) return;
    try {
      const requests: Promise<any>[] = [
        axiosInstance.get(`/api/issues/${issue.id}/dependencies`),
        axiosInstance.get(`/api/issues/${issue.id}/blocks`),
      ];
      if (!isSubtask) {
        requests.push(axiosInstance.get(`/api/issues/${issue.id}/subtasks`));
      }
      if (issue.projectId) {
        requests.push(axiosInstance.get(`/api/issues/project/${issue.projectId}`));
      }

      const results = await Promise.all(requests);
      setDependencies(results[0].data || []);
      setBlocks(results[1].data || []);

      let idx = 2;
      if (!isSubtask) {
        setSubtasks(results[idx]?.data || []);
        idx += 1;
      } else {
        setSubtasks([]);
      }
      if (issue.projectId) {
        setProjectIssues(results[idx]?.data || []);
      }
    } catch (err) {
      console.error("Failed to load subtasks/dependencies", err);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.id]);

  const showError = (err: any, fallback: string) => {
    const message = err?.response?.data?.error || fallback;
    setError(message);
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await axiosInstance.post(`/api/issues/${issue.id}/subtasks`, {
        title: newSubtaskTitle.trim(),
        type: "TASK",
      });
      setSubtasks((prev) => [...prev, res.data]);
      setNewSubtaskTitle("");
    } catch (err) {
      showError(err, "Failed to create subtask");
    } finally {
      setBusy(false);
    }
  };

  const toggleSubtaskDone = async (subtask: any) => {
    setBusy(true);
    setError(null);
    const nextStatus = subtask.status === "DONE" ? "TODO" : "DONE";
    try {
      const res = await axiosInstance.put(`/api/issues/${subtask.id}`, {
        title: subtask.title,
        description: subtask.description,
        type: subtask.type,
        priority: subtask.priority,
        status: nextStatus,
        assigneeId: subtask.assigneeId,
        order: subtask.order ?? 0,
        comments: subtask.comments,
        dueDate: subtask.dueDate ?? null,
      });
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? res.data : s)));
    } catch (err) {
      showError(err, "Failed to update subtask");
    } finally {
      setBusy(false);
    }
  };

  const addDependency = async () => {
    if (!selectedDependencyId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await axiosInstance.post(
        `/api/issues/${issue.id}/dependencies/${selectedDependencyId}`
      );
      onIssueChanged(res.data);
      setSelectedDependencyId("");
      loadAll();
    } catch (err) {
      showError(err, "Failed to add dependency");
    } finally {
      setBusy(false);
    }
  };

  const removeDependency = async (blockerId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await axiosInstance.delete(
        `/api/issues/${issue.id}/dependencies/${blockerId}`
      );
      onIssueChanged(res.data);
      loadAll();
    } catch (err) {
      showError(err, "Failed to remove dependency");
    } finally {
      setBusy(false);
    }
  };

  const dependencyOptions = projectIssues.filter(
    (candidate) =>
      candidate.id !== issue.id &&
      !dependencies.some((d) => d.id === candidate.id)
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Subtasks - only shown for top-level tasks, since a subtask can't have its own subtasks */}
      {!isSubtask && (
        <div>
          <h3 className="text-xs font-bold uppercase mb-2 text-[#6B778C]">
            Subtasks ({subtasks.filter((s) => s.status === "DONE").length}/
            {subtasks.length})
          </h3>

          {subtasks.length > 0 ? (
            <ul className="space-y-1 mb-2">
              {subtasks.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded border border-[#DFE1E6] bg-white px-2 py-1.5 text-sm"
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleSubtaskDone(s)}
                    className="text-[#0052CC] shrink-0"
                    title={s.status === "DONE" ? "Mark as not done" : "Mark as done"}
                  >
                    {s.status === "DONE" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                  <span
                    className={`flex-1 truncate ${
                      s.status === "DONE" ? "line-through text-[#6B778C]" : ""
                    }`}
                  >
                    {s.title}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {STATUS_LABELS[s.status] || s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#6B778C] italic mb-2">No subtasks yet</p>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="New subtask title"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubtask()}
              className="h-8 text-sm"
            />
            <Button
              size="icon-sm"
              disabled={busy || !newSubtaskTitle.trim()}
              onClick={addSubtask}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-[#6B778C] mt-1">
            Subtasks always inherit this task's project and sprint.
          </p>
        </div>
      )}

      {/* Blocked by (dependencies) */}
      <div>
        <h3 className="text-xs font-bold uppercase mb-2 text-[#6B778C] flex items-center gap-1">
          <Link2 className="h-3 w-3" /> Blocked by
        </h3>
        {dependencies.length > 0 ? (
          <ul className="space-y-1 mb-2">
            {dependencies.map((dep) => (
              <li
                key={dep.id}
                className="flex items-center gap-2 rounded border border-[#DFE1E6] bg-white px-2 py-1.5 text-sm"
              >
                <span className="flex-1 truncate">{dep.title}</span>
                <Badge
                  variant={dep.status === "DONE" ? "secondary" : "outline"}
                  className="text-[10px]"
                >
                  {STATUS_LABELS[dep.status] || dep.status}
                </Badge>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeDependency(dep.id)}
                  className="text-[#6B778C] hover:text-red-600"
                  title="Remove dependency"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#6B778C] italic mb-2">Not blocked by anything</p>
        )}

        {dependencyOptions.length > 0 && (
          <div className="flex gap-2">
            <select
              className="flex-1 h-8 rounded-md border border-[#DFE1E6] bg-white px-2 text-sm"
              value={selectedDependencyId}
              onChange={(e) => setSelectedDependencyId(e.target.value)}
            >
              <option value="">Select a blocking task…</option>
              {dependencyOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.title}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={busy || !selectedDependencyId}
              onClick={addDependency}
            >
              Add
            </Button>
          </div>
        )}
      </div>

      {/* Blocks */}
      {blocks.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase mb-2 text-[#6B778C]">
            Blocks
          </h3>
          <ul className="space-y-1">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-2 rounded border border-[#DFE1E6] bg-white px-2 py-1.5 text-sm"
              >
                <span className="flex-1 truncate">{b.title}</span>
                <Badge
                  variant={b.status === "DONE" ? "secondary" : "outline"}
                  className="text-[10px]"
                >
                  {STATUS_LABELS[b.status] || b.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SubtaskAndDependencyPanel;