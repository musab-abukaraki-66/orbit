import { redirectToDefaultWorkspace } from "@/lib/workspaces/context"

export default async function AppIndexPage() {
  await redirectToDefaultWorkspace()
}
