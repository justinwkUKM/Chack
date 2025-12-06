// app/assessments/[assessmentId]/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AssessmentDetailContent from "@/components/assessment-detail-content";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const { assessmentId } = await params;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 bg-white">
      <AssessmentDetailContent
        assessmentId={assessmentId}
        userId={session.user.id}
      />
    </main>
  );
}

