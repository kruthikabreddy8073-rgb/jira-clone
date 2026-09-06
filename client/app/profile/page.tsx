"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import SecuritySettingsPanel from "@/components/SecuritySettingsPanel";
import AvatarUploadDialog from "@/components/AvatarUploadDialog";
import { AlertCircle, CheckCircle2, Mail, Save, BellRing } from "lucide-react";
import React, { useState } from "react";

const page = () => {
  const { user, login } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  const [notifBusy, setNotifBusy] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  if (!user) {
    return <div className="p-6">User not found</div>;
  }

  const toggleEmailNotifications = async () => {
    setNotifError(null);
    setNotifBusy(true);
    try {
      const res = await axiosInstance.put(
        `/api/users/${user.id}/notification-preferences?actingUserId=${user.id}`,
        { emailNotificationsEnabled: !user.emailNotificationsEnabled }
      );
      login(res.data);
    } catch (err: any) {
      setNotifError(err?.response?.data?.error || "Failed to update preference");
    } finally {
      setNotifBusy(false);
    }
  };

  const saveProfile = async () => {
    setProfileError(null);
    setProfileSuccess(false);
    setProfileBusy(true);
    try {
      const res = await axiosInstance.put(`/api/users/${user.id}/profile?actingUserId=${user.id}`, {
        name,
        phone,
      });
      login(res.data);
      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err?.response?.data?.error || "Failed to update profile");
    } finally {
      setProfileBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-auto bg-[#F4F5F7]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#172B4D] mb-2">
          Profile Settings
        </h1>
        <p className="text-[#5E6C84]">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-[#172B4D]">About You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold text-[#172B4D]">
                  {user.name}
                </h2>
                <Badge className="mt-2">{user.role}</Badge>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-[#5E6C84]" />
                  <span className="text-[#172B4D]">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[#5E6C84]">Group:</span>
                  <Badge variant="outline">{user?.group}</Badge>
                </div>
              </div>

              <Button
                className="w-full bg-[#0052CC] text-white hover:bg-[#0747A6]"
                onClick={() => setAvatarDialogOpen(true)}
              >
                Change Profile Picture
              </Button>
              <p className="text-[11px] text-[#6B778C] text-center">
                JPG or PNG - max 5MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#172B4D]">
                Personal Information
              </CardTitle>
              <CardDescription>Update your contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileError && (
                  <div className="flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{profileError}</span>
                  </div>
                )}
                {profileSuccess && (
                  <div className="flex gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Profile updated successfully.</span>
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                    Full Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="focus-visible:ring-[#0052CC]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                    Phone
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Add a phone number"
                    className="focus-visible:ring-[#0052CC]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    disabled
                    value={user.email}
                    className="focus-visible:ring-[#0052CC] bg-[#F4F5F7]"
                  />
                  <p className="text-xs text-[#6B778C] mt-1">
                    Changing your email requires verification - see Security below.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                      Role
                    </label>
                    <Input
                      disabled
                      defaultValue={user.role}
                      className="focus-visible:ring-[#0052CC]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#172B4D] mb-1 block">
                      Team
                    </label>
                    <Input
                      disabled
                      defaultValue={user?.group}
                      className="focus-visible:ring-[#0052CC]"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    disabled={profileBusy}
                    onClick={saveProfile}
                    className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#172B4D]">Activity</CardTitle>
              <CardDescription>
                Your account activity information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#5E6C84]">Account Created</span>
                  <span className="text-[#172B4D] font-semibold">
                    {new Date(user?.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#172B4D] flex items-center gap-2">
                <BellRing className="h-4 w-4" /> Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose whether critical events (task assignment, due dates,
                sprint start/end, status changes) also email you - in-app
                notifications are always on.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifError && (
                <div className="mb-3 flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{notifError}</span>
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!user.emailNotificationsEnabled}
                  disabled={notifBusy}
                  onChange={toggleEmailNotifications}
                  className="h-4 w-4 accent-[#0052CC]"
                />
                <span className="text-sm text-[#172B4D]">
                  Email me about important updates
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Security */}
          <div>
            <h2 className="text-lg font-semibold text-[#172B4D] mb-3">Security</h2>
            <SecuritySettingsPanel />
          </div>
        </div>
      </div>

      <AvatarUploadDialog
        isOpen={avatarDialogOpen}
        onClose={() => setAvatarDialogOpen(false)}
        userId={user.id}
        currentAvatarUrl={user.avatar}
        fallbackLabel={user.name.charAt(0)}
        onUploaded={(updatedUser) => login(updatedUser)}
      />
    </div>
  );
};

export default page;