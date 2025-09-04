"use client";

import { HeroBanner } from "@/components/ui/HeroBanner";
import { useMemo } from "react";

function computeGreeting(): { title: string; subtitle: string; color: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      title: "Good morning",
      subtitle: "Plan your day and set a smart budget.",
      color: "#f59e0b", // amber
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      title: "Good afternoon",
      subtitle: "Track spending and stay on target.",
      color: "#6366f1", // indigo
    };
  }
  if (hour >= 18 && hour < 22) {
    return {
      title: "Good evening",
      subtitle: "Review trends and optimize your savings.",
      color: "#8b5cf6", // violet
    };
  }
  return {
    title: "Good night",
    subtitle: "Log late expenses and pick up tomorrow.",
    color: "#334155", // slate
  };
}

export function DynamicHeroBanner() {
  const { title, subtitle, color } = useMemo(() => computeGreeting(), []);
  return <HeroBanner title={title} subtitle={subtitle} color={color} />;
}


