"use client";

import { useState } from "react";
import { Award, ChevronDown, ChevronUp, Languages, PlayCircle, PlusCircle, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSummary } from "@/lib/types";
import { useUiCopy } from "@/lib/ui-copy";

const statusColors: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  needs_review: "bg-amber-100 text-amber-700",
  ready: "bg-sky-100 text-sky-700",
  not_started: "bg-slate-200 text-slate-700"
};

export function DashboardPanel({
  learnerName,
  language,
  summary,
  onContinueLearning,
  onStartNewTopic
}: {
  learnerName: string;
  language: string;
  summary: DashboardSummary | null;
  onContinueLearning: () => void;
  onStartNewTopic: () => void;
}) {
  const { t } = useUiCopy(language);
  const [expanded, setExpanded] = useState(false);
  const currentModule =
    summary?.modules.find((module) => module.status !== "completed") ??
    summary?.modules[summary.modules.length - 1];
  const completedModules = (summary?.modules ?? []).filter((module) => module.status === "completed");

  const cards = [
    {
      label: t("yourProgress"),
      value: `${summary?.overall_progress ?? 0}%`,
      icon: Target
    },
    {
      label: t("completed"),
      value: `${summary?.completed_modules ?? 0}/${summary?.total_modules ?? 0}`,
      icon: Award
    },
    {
      label: t("xp"),
      value: `${summary?.total_xp ?? 0}`,
      icon: PlayCircle
    },
    {
      label: t("language"),
      value: language,
      icon: Languages
    }
  ];

  return (
    <div className="space-y-10">
      <Card className="border-primary/30">
        <CardHeader className="space-y-3">
          <Badge className="w-fit bg-primary/12 text-primary">{t("yourProgress")}</Badge>
          <CardTitle className="text-4xl">{currentModule?.title ?? t("continueLearning")}</CardTitle>
          <CardDescription>
            {currentModule
              ? t("confidenceAttempts", { score: currentModule.score, attempts: currentModule.attempts })
              : t("startLearningPrompt")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                className="rounded-[24px] border border-border/70 bg-muted/40 p-5"
                key={card.label}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-4 text-3xl font-semibold">{card.value}</p>
              </div>
            ))}
          </div>

          <Button className="h-16 w-full justify-center text-base" onClick={onContinueLearning}>
            <PlayCircle className="mr-2 h-5 w-5" />
            {t("continueLearning")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("actions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-center" onClick={onContinueLearning}>
              {t("continueLearning")}
            </Button>
            <Button className="w-full justify-center" onClick={onStartNewTopic} variant="secondary">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("startNewTopic")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("focus")}</CardTitle>
            <CardDescription>{learnerName}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(summary?.weak_areas ?? []).length ? (
              summary?.weak_areas.slice(0, 4).map((item) => (
                <Badge className="bg-muted text-foreground" key={item}>
                  {item}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("noWeakAreas")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{t("completedModules")}</CardTitle>
            <CardDescription>{t("finishedCount", { count: completedModules.length })}</CardDescription>
          </div>
          <button
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? t("hide") : t("show")}
          </button>
        </CardHeader>
        {expanded ? (
          <CardContent className="space-y-3">
            {completedModules.length ? (
              completedModules.map((module) => (
                <div
                  className="rounded-[20px] border border-border/70 bg-muted/30 px-4 py-3"
                  key={module.module_id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{module.title}</p>
                    <span className="text-sm text-muted-foreground">{module.score}%</span>
                  </div>
                </div>
              ))
            ) : (
              <CardContent className="px-0 pt-0">
                <p className="text-sm text-muted-foreground">{t("noCompletedModules")}</p>
              </CardContent>
            )}
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
