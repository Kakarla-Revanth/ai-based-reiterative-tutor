"use client";

import { MoonStar, SunMedium } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUiCopy } from "@/lib/ui-copy";

export function ThemeToggle({
  theme,
  language,
  onToggle
}: {
  theme: "light" | "dark";
  language: string;
  onToggle: () => void;
}) {
  const { t } = useUiCopy(language);

  return (
    <Button variant="secondary" size="sm" onClick={onToggle}>
      {theme === "dark" ? <SunMedium className="mr-2 h-4 w-4" /> : <MoonStar className="mr-2 h-4 w-4" />}
      {theme === "dark" ? t("light") : t("dark")}
    </Button>
  );
}
