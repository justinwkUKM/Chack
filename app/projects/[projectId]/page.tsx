// app/projects/[projectId]/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectDetailContent from "@/components/project-detail-content";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const { projectId } = await params;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 pt-20 bg-background text-foreground">
      <ProjectDetailContent projectId={projectId} userId={session.user.id} />
    </main>
  );
}

