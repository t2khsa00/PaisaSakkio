"use client";

import { useCallback, useEffect, useState } from "react";
import type { GroupSummary } from "@/lib/types";
import { getGroupSummaries } from "@/lib/api-client";

type SummaryState = {
  groups: GroupSummary[];
  error: string | null;
  loading: boolean;
};

let cachedGroups: GroupSummary[] | null = null;
let cachedError: string | null = null;
let inFlight: Promise<void> | null = null;
const subscribers = new Set<(state: SummaryState) => void>();

function currentState(): SummaryState {
  return {
    groups: cachedGroups ?? [],
    error: cachedError,
    loading: cachedGroups === null && !cachedError,
  };
}

function notify() {
  const state = currentState();
  subscribers.forEach((subscriber) => subscriber(state));
}

async function loadSummaries() {
  if (inFlight) return inFlight;

  inFlight = getGroupSummaries()
    .then((groups) => {
      cachedGroups = groups;
      cachedError = null;
      notify();
    })
    .catch((caught: Error) => {
      cachedError = caught.message;
      notify();
    })
    .finally(() => {
      inFlight = null;
      notify();
    });

  notify();
  return inFlight;
}

export function useGroupSummaries() {
  const [state, setState] = useState<SummaryState>(() => currentState());

  useEffect(() => {
    subscribers.add(setState);
    if (cachedGroups === null && !cachedError) {
      void loadSummaries();
    }

    return () => {
      subscribers.delete(setState);
    };
  }, []);

  const setGroups = useCallback((updater: (groups: GroupSummary[]) => GroupSummary[]) => {
    cachedGroups = updater(cachedGroups ?? []);
    cachedError = null;
    notify();
  }, []);

  const refresh = useCallback(() => {
    cachedError = null;
    void loadSummaries();
  }, []);

  return { ...state, refresh, setGroups };
}
