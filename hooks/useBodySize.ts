"use client";

import { useState, useEffect } from "react";
import type { BodySize } from "@/types";

const STORAGE_KEY = "bodySize:v1";

export function useBodySize() {
  const [bodySize, setBodySizeState] = useState<BodySize | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBodySizeState(JSON.parse(stored));
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setBodySize = (size: BodySize) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
    } catch {
      // localStorage unavailable
    }
    setBodySizeState(size);
  };

  return { bodySize, setBodySize };
}
