import { CheckCircle2, CircleDashed, Milestone, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardSummary, LearningModule } from "@/lib/types";

const statusColors: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  needs_review: "bg-amber-100 text-amber-700",
  ready: "bg-sky-100 text-sky-700",
  not_started: "bg-slate-200 text-slate-700"
};

export function LearningPath({
  modules,
  summary,
  compact = false
}: {
  modules: LearningModule[];
  summary: DashboardSummary | null;
  compact?: boolean;
}) {
  const progressById = new Map((summary?.modules ?? []).map((item) => [item.module_id, item]));
  const stages = modules.length
    ? modules.map((module) => {
        const progress = module.id ? progressById.get(module.id) : undefined;
        return {
          id: `${module.module_index}-${module.title}`,
          title: module.title,
          objective: module.slides[0]?.body[0] ?? "Build the next understanding milestone.",
          status: progress?.status ?? "ready",
          score: progress?.score ?? 0
        };
      })
    : (summary?.modules ?? []).length
      ? (summary?.modules ?? []).map((module, index) => ({
          id: `${module.module_id}-${module.title}`,
          title: module.title,
          objective: module.weak_concepts.length
            ? `Revisit: ${module.weak_concepts.join(", ")}`
            : `Continue module ${index + 1} and improve confidence.`,
          status: module.status,
          score: module.score
        }))
    : [
        {
          id: "discover",
          title: "Discover",
          objective: "Generate a topic and create the first set of modules.",
          status: "ready",
          score: 0
        },
        {
          id: "understand",
          title: "Understand",
          objective: "Teach with slides, narration, and guided explanation.",
          status: "not_started",
          score: 0
        },
        {
          id: "practice",
          title: "Practice",
          objective: "Evaluate answers through text or voice interaction.",
          status: "not_started",
          score: 0
        },
        {
          id: "mastery",
          title: "Mastery",
          objective: "Close weak areas and finish the adaptive loop.",
          status: "not_started",
          score: 0
        }
      ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning path</CardTitle>
        <CardDescription>
          A clearer path from foundation to mastery, with each step showing its current state.
        </CardDescription>
      </CardHeader>
      <CardContent className={compact ? "space-y-3" : "space-y-4"}>
        <Progress value={summary?.overall_progress ?? 0} />
        <div className={compact ? "space-y-3" : "grid gap-4 lg:grid-cols-2"}>
          {stages.map((stage, index) => (
            <div
              className="rounded-[28px] border border-border/70 bg-white/70 p-4 dark:bg-slate-950/20"
              key={stage.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {stage.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : stage.status === "needs_review" ? (
                    <Milestone className="h-5 w-5 text-amber-500" />
                  ) : (
                    <CircleDashed className="h-5 w-5 text-sky-500" />
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Step {index + 1}</p>
                    <p className="font-semibold">{stage.title}</p>
                  </div>
                </div>
                <Badge className={statusColors[stage.status] ?? ""}>{stage.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{stage.objective}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                {stage.score ? `Last score ${stage.score}%` : "Waiting for learner progress"}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
