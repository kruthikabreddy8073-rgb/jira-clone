"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { AlertCircle, CheckCircle2, Mail, KeyRound, ShieldOff } from "lucide-react";

const SecuritySettingsPanel = () => {
  const { user, login, logout } = useAuth();
  const router = useRouter();

  const [newEmail, setNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [pendingConfirmLink, setPendingConfirmLink] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  const requestEmailChange = async () => {
    if (!user) return;
    setEmailError(null);
    setEmailBusy(true);
    setEmailConfirmed(false);
    try {
      const res = await axiosInstance.post(`/api/users/${user.id}/email-change`, {
        newEmail,
        currentPassword: emailCurrentPassword,
      });
      setPendingConfirmLink(res.data.devConfirmationLink);
    } catch (err: any) {
      setEmailError(err?.response?.data?.error || "Failed to request email change");
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmailChange = async () => {
    if (!user || !pendingConfirmLink) return;
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await axiosInstance.get(pendingConfirmLink);
      login(res.data);
      setEmailConfirmed(true);
      setPendingConfirmLink(null);
      setNewEmail("");
      setEmailCurrentPassword("");
    } catch (err: any) {
      setEmailError(err?.response?.data?.error || "Failed to confirm email change");
    } finally {
      setEmailBusy(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const changePassword = async () => {
    if (!user) return;
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }

    setPasswordBusy(true);
    try {
            await axiosInstance.put(`/api/users/${user.id}/password?actingUserId=${user.id}`, {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setPasswordError(err?.response?.data?.error || "Failed to change password");
    } finally {
      setPasswordBusy(false);
    }
  };

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [deactivateBusy, setDeactivateBusy] = useState(false);

  const deactivateAccount = async () => {
    if (!user) return;
    setDeactivateError(null);
    setDeactivateBusy(true);
    try {
           await axiosInstance.post(`/api/users/${user.id}/deactivate?actingUserId=${user.id}`, {
        currentPassword: deactivatePassword,
      });
      logout();
      router.push("/login");
    } catch (err: any) {
      setDeactivateError(err?.response?.data?.error || "Failed to deactivate account");
    } finally {
      setDeactivateBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[#172B4D] flex items-center gap-2">
            <Mail className="h-4 w-4" /> Change Email
          </CardTitle>
          <CardDescription>
            Current: {user.email}. A confirmation link must be verified before the change takes effect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailError && (
            <div className="mb-4 flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{emailError}</span>
            </div>
          )}
          {emailConfirmed && (
            <div className="mb-4 flex gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Email address updated successfully.</span>
            </div>
          )}

          {!pendingConfirmLink ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                  New email address
                </label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                  Current password
                </label>
                <Input
                  type="password"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={emailBusy || !newEmail || !emailCurrentPassword}
                  onClick={requestEmailChange}
                  className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
                >
                  Send confirmation link
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#5E6C84]">
                A confirmation link was sent to <strong>{newEmail}</strong>. No mail server is
                configured in this project, so for testing you can confirm it directly below.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPendingConfirmLink(null);
                    setNewEmail("");
                    setEmailCurrentPassword("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={emailBusy}
                  onClick={confirmEmailChange}
                  className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
                >
                  Confirm now (dev)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#172B4D] flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change Password
          </CardTitle>
          <CardDescription>
            Must be at least 8 characters with an uppercase letter, lowercase letter, number, and
            special character.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordError && (
            <div className="mb-4 flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}
          {passwordSuccess && (
            <div className="mb-4 flex gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Password updated successfully.</span>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                Current password
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                New password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                Confirm new password
              </label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                disabled={passwordBusy || !currentPassword || !newPassword || !confirmNewPassword}
                onClick={changePassword}
                className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
              >
                Update password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <ShieldOff className="h-4 w-4" /> Deactivate Account
          </CardTitle>
          <CardDescription>
            This restricts login access. Your historical activity is preserved for auditing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deactivateError && (
            <div className="mb-4 flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{deactivateError}</span>
            </div>
          )}

          {!showDeactivateConfirm ? (
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setShowDeactivateConfirm(true)}
            >
              Deactivate my account
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800 font-medium">
                Are you sure? Enter your password to confirm - you will be logged out immediately.
              </p>
              <Input
                type="password"
                placeholder="Current password"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeactivateConfirm(false);
                    setDeactivatePassword("");
                    setDeactivateError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={deactivateBusy || !deactivatePassword}
                  onClick={deactivateAccount}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Yes, deactivate
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettingsPanel;