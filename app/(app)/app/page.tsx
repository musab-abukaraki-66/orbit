import { ArrowUpRight, Boxes, Kanban, Plus } from "lucide-react"

import { requireUser } from "@/lib/auth/session"
import { hasCompletedOnboardingTour } from "@/lib/onboarding/tour"
import {
  getBoardCountsByWorkspace,
  getTeamMemberCount,
  getWorkspaceContext,
} from "@/lib/workspaces/data"
import { BoardCard } from "@/components/board-card"
import { getTaskCountsByBoard } from "@/lib/tasks/data"
import { CreateBoardDialog } from "@/components/create-board-dialog"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"
import { WelcomeTour } from "@/components/onboarding/welcome-tour"
import { WorkspaceMenu } from "@/components/workspace-menu"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function AppHomePage() {
  const user = await requireUser()
  const context = await getWorkspaceContext(user.id)
  const team = context?.team
  const activeWorkspace = context?.activeWorkspace
  const workspaces = context?.workspaces ?? []
  const boards = context?.boards ?? []

  const memberCount = team ? await getTeamMemberCount(team.id) : 0
  const boardCounts = team ? await getBoardCountsByWorkspace(team.id) : new Map()
  const taskCounts = await getTaskCountsByBoard(
    boards.map((board) => board.id),
  )

  const fullName = String(user.user_metadata?.full_name ?? "").trim()
  const firstName = fullName.split(/\s+/)[0] || "there"
  const showTour = !hasCompletedOnboardingTour(user)

  const stats = [
    { label: "Workspaces", value: String(workspaces.length) },
    { label: "Boards", value: String(boards.length) },
    { label: "Team members", value: String(memberCount) },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      {showTour ? (
        <WelcomeTour
          firstName={firstName}
          workspaceId={activeWorkspace?.id ?? null}
        />
      ) : null}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Working in{" "}
          <span className="font-medium text-foreground">
            {activeWorkspace?.name ?? team?.name}
          </span>
          . Organize work into boards and track progress.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-2xl font-semibold tabular-nums">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {workspaces.length === 0 ? (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-muted-foreground" />
              Get started with a workspace
            </CardTitle>
            <CardDescription>
              Workspaces keep your team&apos;s boards organized by product or
              project.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Boxes className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">No workspaces yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create your first workspace to start planning work with your
                team.
              </p>
            </div>
            <CreateWorkspaceDialog
              trigger={
                <Button>
                  Create workspace
                  <ArrowUpRight className="size-4" />
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <Kanban className="size-4 text-muted-foreground" />
                  Boards in {activeWorkspace?.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {boards.length === 0
                    ? "No boards yet — create your first one."
                    : `${boards.length} board${boards.length === 1 ? "" : "s"} in this workspace.`}
                </p>
              </div>
              {activeWorkspace ? (
                <CreateBoardDialog workspaceId={activeWorkspace.id} />
              ) : null}
            </div>

            {boards.length === 0 ? (
              <Card className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Kanban className="size-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">No boards yet</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Create a board to organize tasks into lanes you control.
                  </p>
                </div>
                {activeWorkspace ? (
                  <CreateBoardDialog
                    workspaceId={activeWorkspace.id}
                    trigger={
                      <Button size="sm">
                        <Plus />
                        New board
                      </Button>
                    }
                  />
                ) : null}
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {boards.map((board) => (
                  <BoardCard
                    key={board.id}
                    board={board}
                    taskCount={taskCounts.get(board.id) ?? 0}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <Boxes className="size-4 text-muted-foreground" />
                  Workspaces
                </h2>
                <p className="text-xs text-muted-foreground">
                  Switch between workspaces to see their boards.
                </p>
              </div>
              <CreateWorkspaceDialog />
            </div>

            <div className="flex flex-col gap-2">
              {workspaces.map((workspace) => {
                const isActive = workspace.id === activeWorkspace?.id
                const count = boardCounts.get(workspace.id) ?? 0
                return (
                  <Card key={workspace.id} size="sm">
                    <CardContent className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Boxes className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">
                          {workspace.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {count} board{count === 1 ? "" : "s"}
                        </span>
                      </div>
                      {isActive ? (
                        <span className="inline-flex h-5 items-center rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground">
                          Active
                        </span>
                      ) : null}
                      <WorkspaceMenu
                        workspaceId={workspace.id}
                        workspaceName={workspace.name}
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
