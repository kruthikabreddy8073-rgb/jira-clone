"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";

interface Project {
  id: string;
  name: string;
  key: string;
  ownerId: string;
  memberIds: string[];
  description?: string;
  createdAt?: string;
}

interface Issue {
  id: string;
  key?: string;
  title?: string;
  status?: string;
  projectId?: string;
}

const Page = () => {
  const router = useRouter();

  const { user, setSelectedProject } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [issuesByProject, setIssuesByProject] = useState<
    Record<string, Issue[]>
  >({});

  const [loading, setLoading] = useState<boolean>(false);

  /*
   * Fetch all projects available to the current user
   */
  const fetchProjects = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const response = await axiosInstance.get("/api/projects");

      const allProjects: Project[] = response.data || [];

      const userProjects = allProjects.filter(
        (project) =>
          project.ownerId === user.id ||
          project.memberIds?.includes(user.id)
      );

      setProjects(userProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  /*
   * Fetch issues belonging to a project
   */
  const fetchIssuesForProject = async (projectId: string) => {
    try {
      const response = await axiosInstance.get(
        `/api/issues/project/${projectId}`
      );

      setIssuesByProject((previous) => ({
        ...previous,
        [projectId]: response.data || [],
      }));
    } catch (error) {
      console.error(
        `Failed to fetch issues for project ${projectId}:`,
        error
      );

      setIssuesByProject((previous) => ({
        ...previous,
        [projectId]: [],
      }));
    }
  };

  /*
   * Fetch projects when the user is available
   */
  useEffect(() => {
    if (!user?.id) return;

    fetchProjects();
  }, [user?.id]);

  /*
   * Fetch issues whenever the project list changes
   */
  useEffect(() => {
    if (projects.length === 0) return;

    projects.forEach((project) => {
      fetchIssuesForProject(project.id);
    });
  }, [projects]);

  /*
   * Navigate to create project page
   */
  const handleCreateProject = () => {
    router.push("/create-project");
  };

  /*
   * Select project and go to board
   */
  const handleViewBoard = (project: Project) => {
    setSelectedProject(project);
  };

  /*
   * Loading state
   */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Loading projects…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-[#172B4D]">
          Projects
        </h1>

        <p className="text-[#5E6C84]">
          Manage and view all your projects
        </p>
      </div>

      {/* Create Project Button */}
      <Button
        className="mb-6 w-fit bg-[#0052CC] text-white hover:bg-[#0747A6]"
        onClick={handleCreateProject}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Project
      </Button>

      {/* Projects Grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const projectIssues = issuesByProject[project.id] || [];

            const memberCount = project.memberIds?.length || 0;

            return (
              <Card
                key={project.id}
                className="cursor-pointer transition-shadow hover:shadow-lg"
              >
                {/* Card Header */}
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-[#172B4D]">
                        {project.name}
                      </CardTitle>

                      <CardDescription>
                        Key: {project.key}
                      </CardDescription>
                    </div>

                    <Badge variant="outline">
                      {project.key}
                    </Badge>
                  </div>
                </CardHeader>

                {/* Card Content */}
                <CardContent>
                  <div className="space-y-4">
                    {/* Description */}
                    <p className="text-sm text-[#5E6C84]">
                      {project.description || "No description"}
                    </p>

                    {/* Project Information */}
                    <div className="flex items-center gap-4 text-sm">
                      {/* Members */}
                      <div className="flex items-center gap-2 text-[#5E6C84]">
                        <Users className="h-4 w-4" />

                        <span>
                          {memberCount}{" "}
                          {memberCount === 1
                            ? "member"
                            : "members"}
                        </span>
                      </div>

                      {/* Issues */}
                      <div className="text-[#5E6C84]">
                        {projectIssues.length}{" "}
                        {projectIssues.length === 1
                          ? "issue"
                          : "issues"}
                      </div>
                    </div>

                    {/* View Board Button */}
                    <Link
                      href="/"
                      onClick={() => handleViewBoard(project)}
                      className="block"
                    >
                      <Button
                        variant="outline"
                        className="mt-2 w-full border-[#0052CC] bg-transparent text-[#0052CC] hover:bg-[#DEEBFF]"
                      >
                        View Board
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* No Projects */}
      {projects.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center">
          <p className="mb-4 text-[#5E6C84]">
            No projects yet
          </p>

          <Button
            className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
            onClick={handleCreateProject}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create your first project
          </Button>
        </div>
      )}
    </div>
  );
};

export default Page;
