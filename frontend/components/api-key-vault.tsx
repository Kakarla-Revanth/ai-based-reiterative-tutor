"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STORAGE_KEYS } from "@/lib/constants";
import { ProviderKeys } from "@/lib/types";
import { useUiCopy } from "@/lib/ui-copy";

const EMPTY_KEYS: ProviderKeys = {
  geminiApiKey: ""
};

export function ApiKeyVault({ compact = false, language = "English" }: { compact?: boolean; language?: string }) {
  const [keys, setKeys] = useState<ProviderKeys>(EMPTY_KEYS);
  const [revealed, setRevealed] = useState<Record<keyof ProviderKeys, boolean>>({
    geminiApiKey: false
  });
  const [status, setStatus] = useState("Keys stay in this browser unless you send a request.");
  const { t } = useUiCopy(language);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEYS.providerKeys);
    if (!raw) {
      return;
    }
    try {
      setKeys({ ...EMPTY_KEYS, ...(JSON.parse(raw) as ProviderKeys) });
      setStatus("Saved keys loaded from this browser.");
    } catch {
      setKeys(EMPTY_KEYS);
    }
  }, []);

  const saveKeys = () => {
    window.localStorage.setItem(STORAGE_KEYS.providerKeys, JSON.stringify(keys));
    setStatus("Keys saved. New tutor requests will use these values.");
  };

  const clearKeys = () => {
    window.localStorage.removeItem(STORAGE_KEYS.providerKeys);
    setKeys(EMPTY_KEYS);
    setStatus("Stored keys cleared from this browser.");
  };

  return (
    <Card className={compact ? "bg-black/50 text-white" : "bg-black/60 text-white"}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <KeyRound className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-white">{t("keyVaultTitle")}</CardTitle>
            <CardDescription className="text-white/65">
              {t("keyVaultSubtitle")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-white" />
            <p>{t("keyVaultHint")}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/55">
            <span>{t("geminiApiKey")}</span>
            <button
              className="inline-flex items-center gap-1 text-white/70"
              onClick={() => setRevealed((current) => ({ ...current, geminiApiKey: !current.geminiApiKey }))}
              type="button"
            >
              {revealed.geminiApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {revealed.geminiApiKey ? t("hide") : t("show")}
            </button>
          </div>
          <Input
            className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
            placeholder={t("geminiApiKey")}
            type={revealed.geminiApiKey ? "text" : "password"}
            value={keys.geminiApiKey}
            onChange={(event) => setKeys({ geminiApiKey: event.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={saveKeys} variant="default">
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t("saveKeys")}
          </Button>
          <Button onClick={clearKeys} variant="secondary">
            {t("clear")}
          </Button>
        </div>
        {!compact ? <p className="text-sm text-white/60">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
