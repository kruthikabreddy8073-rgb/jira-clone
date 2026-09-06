"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Clock, Pencil, Trash2, History, AlertCircle } from "lucide-react";

type Props = {
  issue: any;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const WorkLogPanel = ({ issue }: Props) => {
  const { user } = useAuth();

  const [logs, setLogs] = useState<any[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [sprintTotalHours, setSprintTotalHours] = useState<number | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState(todayIso());
  const [newHours, setNewHours] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editConfirming, setEditConfirming] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<Record<string, any[]>>({});

  const canModify = (log: any) => {
    if (!user) return false;
    if (user.id === issue.assigneeId) return true;
    const role = (user.role || "").toUpperCase();
    return role === "PM" || role === "PROJECT_MANAGER" || role === "MANAGER";
  };

  const loadUserName = async (userId: string) => {
    if (!userId || userNames[userId]) return;
    try {
      const res = await axiosInstance.get(`/api/users/${userId}`);
      setUserNames((prev) => ({ ...prev, [userId]: res.data.name }));
    } catch {
      // non-fatal - falls back to showing the raw id
    }
  };

  const loadLogs = async () => {
    if (!issue?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [logsRes, totalRes] = await Promise.all([
        axiosInstance.get(`/api/issues/${issue.id}/worklogs`),
        axiosInstance.get(`/api/issues/${issue.id}/worklogs/total`),
      ]);
      setLogs(logsRes.data || []);
      setTotalHours(totalRes.data?.totalHours ?? 0);
      (logsRes.data || []).forEach((log: any) => loadUserName(log.userId));

      if (issue.sprintId) {
        try {
          const sprintTotalRes = await axiosInstance.get(
            `/api/sprints/${issue.sprintId}/worklogs/total`
          );
          setSprintTotalHours(sprintTotalRes.data?.totalHours ?? 0);
        } catch {
          setSprintTotalHours(null); // non-fatal - just hide the sprint total
        }
      } else {
        setSprintTotalHours(null);
      }
    } catch (err) {
      console.error("Failed to load work logs", err);
      setError("Failed to load work logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.id]);

  const submitNewEntry = async () => {
    if (!user) return;
    setAddError(null);
    const hoursNum = parseFloat(newHours);
    if (!newDate) {
      setAddError("Please choose a date");
      return;
    }
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setAddError("Hours must be a positive number");
      return;
    }
    if (!newDescription.trim()) {
      setAddError("Please describe the work performed");
      return;
    }

    setAddBusy(true);
    try {
      await axiosInstance.post(
        `/api/issues/${issue.id}/worklogs?actingUserId=${user.id}`,
        { workDate: newDate, hours: hoursNum, description: newDescription.trim() }
      );
      setNewDate(todayIso());
      setNewHours("");
      setNewDescription("");
      setShowAddForm(false);
      loadLogs();
    } catch (err: any) {
      setAddError(err?.response?.data?.error || "Failed to log time");
    } finally {
      setAddBusy(false);
    }
  };

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setEditDate(log.workDate);
    setEditHours(String(log.hours));
    setEditDescription(log.description);
    setEditConfirming(false);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditConfirming(false);
    setEditError(null);
  };

  const confirmSaveEdit = async () => {
    if (!user || !editingId) return;
    setEditError(null);
    const hoursNum = parseFloat(editHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setEditError("Hours must be a positive number");
      return;
    }
    if (!editDescription.trim()) {
      setEditError("Please describe the work performed");
      return;
    }
    try {
      await axiosInstance.put(
        `/api/worklogs/${editingId}?actingUserId=${user.id}&confirmed=true`,
        { workDate: editDate, hours: hoursNum, description: editDescription.trim() }
      );
      setEditingId(null);
      setEditConfirming(false);
      loadLogs();
    } catch (err: any) {
      setEditError(err?.response?.data?.error || "Failed to update entry");
    }
  };

  const confirmDelete = async (logId: string) => {
    if (!user) return;
    setDeleteError(null);
    try {
      await axiosInstance.delete(
        `/api/worklogs/${logId}?actingUserId=${user.id}&confirmed=true`
      );
      setDeletingId(null);
      loadLogs();
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || "Failed to delete entry");
    }
  };

  const toggleAudit = async (logId: string) => {
    if (expandedAuditId === logId) {
      setExpandedAuditId(null);
      return;
    }
    setExpandedAuditId(logId);
    if (!auditEntries[logId]) {
      try {
        const res = await axiosInstance.get(`/api/worklogs/${logId}/audit`);
        setAuditEntries((prev) => ({ ...prev, [logId]: res.data || [] }));
      } catch (err) {
        console.error("Failed to load audit trail", err);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" /> Work Log
        </h3>
        <div className="text-right text-sm text-[#5E6C84]">
          <div>
            Task total: <strong className="text-[#172B4D]">{totalHours.toFixed(2)}h</strong>
          </div>
          {sprintTotalHours !== null && (
            <div className="text-xs">
              Sprint total: <strong className="text-[#172B4D]">{sprintTotalHours.toFixed(2)}h</strong>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 flex gap-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#6B778C] italic">Loading…</p>
      ) : (
        <div className="space-y-2 mb-3">
          {logs.length === 0 && (
            <p className="text-sm text-[#6B778C] italic">No time logged yet</p>
          )}
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-md border border-[#DFE1E6] bg-white p-3 text-sm"
            >
              {editingId === log.id ? (
                <div className="space-y-2">
                  {editError && (
                    <div className="flex gap-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{editError}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      max={todayIso()}
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.25"
                      min="0.01"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="h-8 w-24 text-sm"
                      placeholder="Hours"
                    />
                  </div>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                  {!editConfirming ? (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
                        onClick={() => setEditConfirming(true)}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2 space-y-2">
                      <p className="text-xs text-amber-800">
                        Confirm saving these changes to the log entry?
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditConfirming(false)}>
                          Back
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
                          onClick={confirmSaveEdit}
                        >
                          Yes, save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#172B4D]">
                          {log.hours}h
                        </span>
                        <span className="text-[#6B778C]">
                          on {new Date(log.workDate).toLocaleDateString()}
                        </span>
                        <span className="text-[#6B778C]">
                          - {userNames[log.userId] || log.userId}
                        </span>
                      </div>
                      <p className="text-[#42526E] mt-1 whitespace-pre-wrap">
                        {log.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="History"
                        onClick={() => toggleAudit(log.id)}
                        className="text-[#6B778C] hover:text-[#172B4D] p-1"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      {canModify(log) && (
                        <>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => startEdit(log)}
                            className="text-[#6B778C] hover:text-[#0052CC] p-1"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => {
                              setDeletingId(log.id);
                              setDeleteError(null);
                            }}
                            className="text-[#6B778C] hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {deletingId === log.id && (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 space-y-2">
                      {deleteError && (
                        <p className="text-xs text-red-700">{deleteError}</p>
                      )}
                      <p className="text-xs text-red-800">
                        Delete this log entry? This cannot be undone.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={() => confirmDelete(log.id)}
                        >
                          Yes, delete
                        </Button>
                      </div>
                    </div>
                  )}

                  {expandedAuditId === log.id && (
                    <div className="mt-2 rounded-md bg-[#F4F5F7] p-2 space-y-1">
                      {(auditEntries[log.id] || []).length === 0 ? (
                        <p className="text-xs text-[#6B778C] italic">No history</p>
                      ) : (
                        (auditEntries[log.id] || []).map((entry: any) => (
                          <div key={entry.id} className="text-xs text-[#5E6C84]">
                            <span className="font-semibold">{entry.action}</span>
                            {" - "}
                            {entry.details}
                            {" ("}
                            {new Date(entry.timestamp).toLocaleString()}
                            {")"}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!showAddForm ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(true)}
          className="w-full"
        >
          + Log time
        </Button>
      ) : (
        <div className="rounded-md border border-[#DFE1E6] bg-white p-3 space-y-2">
          {addError && (
            <div className="flex gap-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{addError}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="date"
              max={todayIso()}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              type="number"
              step="0.25"
              min="0.01"
              placeholder="Hours"
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
              className="h-8 w-24 text-sm"
            />
          </div>
          <Textarea
            placeholder="What did you work on?"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="text-sm"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setAddError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={addBusy}
              className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
              onClick={submitNewEntry}
            >
              Log time
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkLogPanel;