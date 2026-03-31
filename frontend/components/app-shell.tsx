"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, LayoutDashboard, LogOut, Rocket, Settings2, X } from "lucide-react";

import { ApiKeyVault } from "@/components/api-key-vault";
import { AuthPanel } from "@/components/auth-panel";
import { DashboardPanel } from "@/components/dashboard-panel";
import { LearningStudio } from "@/components/learning-studio";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import { AppUser, DashboardSummary, EvaluationResponse, GenerateModulesResponse, LearningStyle } from "@/lib/types";
import { readSavedLanguage, useUiCopy } from "@/lib/ui-copy";

type AuthMode = "signup" | "login";
type ViewMode = "dashboard" | "learn";

export function AppShell() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [view, setView] = useState<ViewMode>("learn");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AppUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [modulesResponse, setModulesResponse] = useState<GenerateModulesResponse | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [backendState, setBackendState] = useState<"checking" | "online" | "offline">("checking");
  const [showKeyVault, setShowKeyVault] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("English");
  const uiLanguage = activeLanguage || user?.language || readSavedLanguage();
  const { t } = useUiCopy(uiLanguage);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEYS.theme) as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const nextTheme = savedTheme ?? systemTheme;
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");

    const storedToken = window.localStorage.getItem(STORAGE_KEYS.token) ?? "";
    const storedUser = window.localStorage.getItem(STORAGE_KEYS.user);
    const storedLanguage = window.localStorage.getItem(STORAGE_KEYS.language);

    if (storedToken && storedUser) {
      setToken(storedToken);
      const parsedUser = JSON.parse(storedUser) as AppUser;
      setUser(parsedUser);
      setActiveLanguage(storedLanguage || parsedUser.language || "English");
    } else {
      setActiveLanguage(storedLanguage || "English");
    }

    void checkBackendHealth();
  }, []);

  useEffect(() => {
    if (!modulesResponse?.language) {
      return;
    }
    setActiveLanguage(modulesResponse.language);
    window.localStorage.setItem(STORAGE_KEYS.language, modulesResponse.language);
  }, [modulesResponse]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void refreshSummary(token);
  }, [token]);

  const refreshSummary = async (authToken = token) => {
    try {
      const nextSummary = await api.fetchSummary(authToken);
      setSummary(nextSummary);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Could not fetch the dashboard summary.");
    }
  };

  const persistSession = (authToken: string, nextUser: AppUser) => {
    setToken(authToken);
    setUser(nextUser);
    setActiveLanguage(nextUser.language || "English");
    setView("learn");
    window.localStorage.setItem(STORAGE_KEYS.token, authToken);
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    window.localStorage.setItem(STORAGE_KEYS.language, nextUser.language || "English");
  };

  const checkBackendHealth = async () => {
    try {
      await api.health();
      setBackendState("online");
    } catch {
      setBackendState("offline");
      setError("The backend is offline. Start the FastAPI server, then refresh the page.");
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    setActiveLanguage("English");
    setSummary(null);
    setModulesResponse(null);
    setEvaluation(null);
    window.localStorage.removeItem(STORAGE_KEYS.token);
    window.localStorage.removeItem(STORAGE_KEYS.user);
    window.localStorage.removeItem(STORAGE_KEYS.language);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  if (!user || !token) {
    return (
      <main className="min-h-screen px-6 py-8 md:px-10">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hero-panel glass rounded-[40px] border border-white/10 p-8 md:p-12">
            <div className="space-y-7">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/70 text-primary dark:bg-slate-900/50">{t("appBadge")}</Badge>
              <Badge
                className={
                  backendState === "online"
                    ? "bg-emerald-100 text-emerald-700"
                    : backendState === "offline"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-200 text-slate-700"
                }
              >
                {backendState === "online"
                  ? t("backendOnline")
                  : backendState === "offline"
                    ? t("backendOffline")
                    : t("backendChecking")}
              </Badge>
            </div>
            <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              {t("heroSubtitle")}
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                t("featureLessons"),
                t("featureVoice"),
                t("featureLanguages")
              ].map((item) => (
                <Card className="p-5" key={item}>
                  <p className="text-sm font-semibold">{item}</p>
                </Card>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle language={uiLanguage} onToggle={toggleTheme} theme={theme} />
              <Button onClick={checkBackendHealth} variant="secondary">
                {t("recheck")}
              </Button>
            </div>
            </div>
          </div>

          <div className="space-y-6">
            <AuthPanel
              error={error}
              language={uiLanguage}
              loading={authLoading}
              mode={authMode}
              onLogin={async (payload) => {
                setError("");
                setAuthLoading(true);
                try {
                  const result = await api.login(payload);
                  persistSession(result.access_token, result.user);
                } catch (apiError) {
                  setError(apiError instanceof Error ? apiError.message : "Login failed.");
                } finally {
                  setAuthLoading(false);
                }
              }}
              onModeChange={setAuthMode}
              onSignup={async (payload) => {
                setError("");
                setAuthLoading(true);
                try {
                  const result = await api.signup(payload);
                  persistSession(result.access_token, result.user);
                } catch (apiError) {
                  setError(apiError instanceof Error ? apiError.message : "Signup failed.");
                } finally {
                  setAuthLoading(false);
                }
              }}
            />
            <Button onClick={() => setShowKeyVault(true)} variant="secondary">
              <Settings2 className="mr-2 h-4 w-4" />
              {t("openKeyVault")}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="glass sticky top-4 h-fit rounded-[28px] border border-border/70 p-4">
          <div className="flex h-full flex-col">
            <div>
              <Badge className="bg-primary/12 text-primary">{t("appBadge")}</Badge>
              <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
            </div>

            <div className="mt-8 space-y-2">
              <button
                className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left ${
                  view === "dashboard" ? "bg-primary text-primary-foreground" : "bg-card/70"
                }`}
                onClick={() => setView("dashboard")}
                type="button"
              >
                <LayoutDashboard className="h-5 w-5" />
                {t("dashboard")}
              </button>
              <button
                className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left ${
                  view === "learn" ? "bg-primary text-primary-foreground" : "bg-card/70"
                }`}
                onClick={() => setView("learn")}
                type="button"
              >
                <BookOpenCheck className="h-5 w-5" />
                {t("learningStudio")}
              </button>
            </div>

            <div className="mt-8 space-y-3">
              <Button onClick={() => setShowKeyVault(true)} variant="secondary">
                <Settings2 className="mr-2 h-4 w-4" />
                {t("keyVault")}
              </Button>
              <ThemeToggle language={uiLanguage} onToggle={toggleTheme} theme={theme} />
              <Button onClick={logout} variant="secondary">
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")}
              </Button>
            </div>
          </div>
        </aside>

        <section className="space-y-8">
          <Card className="hero-panel flex items-center justify-between p-6">
            <div>
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                <p className="font-semibold">{t("continueLearning")}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t("heroSubtitle")}</p>
            </div>
            <Badge className="bg-muted text-foreground">
              {backendState === "online"
                ? t("backendOnline")
                : backendState === "offline"
                  ? t("backendOffline")
                  : t("backendChecking")}
            </Badge>
          </Card>

          {view === "dashboard" ? (
            <DashboardPanel
              language={uiLanguage}
              learnerName={user.name}
              onContinueLearning={() => setView("learn")}
              onStartNewTopic={() => {
                setView("learn");
                setModulesResponse(null);
                setEvaluation(null);
              }}
              summary={summary}
            />
          ) : (
            <LearningStudio
              evaluating={evaluating}
              evaluation={evaluation}
              generating={generating}
              modulesResponse={modulesResponse}
              onAskCoach={async (payload) => {
                const result = await api.askCoach(token, payload);
                return result.answer;
              }}
              onEvaluate={async ({ module_id, questionIndex, user_answer }) => {
                const module = modulesResponse?.modules.find((item) => item.id === module_id);
                const question = module?.questions[questionIndex];
                if (!question) {
                  return;
                }
                setEvaluating(true);
                setError("");
                try {
                  const result = await api.evaluateAnswer(token, {
                    module_id,
                    question,
                    user_answer
                  });
                  setEvaluation(result);
                  await refreshSummary();
                } catch (apiError) {
                  setError(apiError instanceof Error ? apiError.message : "Evaluation failed.");
                } finally {
                  setEvaluating(false);
                }
              }}
              onGenerateModules={async (payload: {
                topic: string;
                language: string;
                learning_style: LearningStyle;
              }) => {
                setGenerating(true);
                setEvaluation(null);
                setError("");
                setActiveLanguage(payload.language);
                window.localStorage.setItem(STORAGE_KEYS.language, payload.language);
                try {
                  const response = await api.generateModules(token, payload);
                  setModulesResponse(response);
                  setUser((current) => {
                    if (!current) {
                      return current;
                    }
                    const nextUser = { ...current, language: payload.language };
                    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
                    return nextUser;
                  });
                  setView("learn");
                  await refreshSummary();
                } catch (apiError) {
                  setError(apiError instanceof Error ? apiError.message : "Module generation failed.");
                } finally {
                  setGenerating(false);
                }
              }}
              preferredLanguage={uiLanguage}
              token={token}
            />
          )}

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
        </section>
      </div>

      {showKeyVault ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="relative w-full max-w-xl">
            <button
              className="absolute right-4 top-4 z-10 rounded-full border border-border/70 bg-card p-2"
              onClick={() => setShowKeyVault(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
            <ApiKeyVault language={uiLanguage} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
