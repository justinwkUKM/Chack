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
    <main className="min-h-screen bg-background pt-20 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AssessmentDetailContent
          assessmentId={assessmentId}
          userId={session.user.id}
        />
      </div>
    </main>
  );
}

