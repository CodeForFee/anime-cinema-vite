import { useLocation, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSearchQuery } from "@/core/queries";
import { onBack } from "@/platform/back";
import { useDebounce } from "@/shared/lib/useDebounce";

/**
 * The header's live search, for both forms: what is typed, the results a moment after typing stops, whether the
 * results panel (and on mobile the whole search popup) is open. Everything closes on a page change, on a click
 * elsewhere and on the Android back button.
 */
export function useSearchBox() {
  const navigate = useNavigate();
  const href = useLocation({ select: (location) => location.href });
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const debounced = useDebounce(trimmed, 350);
  const { data, isFetching } = useSearchQuery(debounced);

  const close = useCallback(() => {
    setIsResultsOpen(false);
    setIsOpen(false);
    inputRef.current?.blur();
  }, []);
  const open = useCallback(() => {
    setIsOpen(true);
    // focus once the box is shown (on mobile it is hidden until opened)
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => (isOpen ? onBack(close) : undefined), [isOpen, close]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node))
        setIsResultsOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: href is the trigger
  useEffect(() => {
    setIsResultsOpen(false);
    setIsOpen(false);
  }, [href]);

  return {
    query,
    trimmed,
    isOpen,
    open,
    close,
    formRef,
    inputRef,
    results: data?.items ?? [],
    isWaiting: isFetching || debounced !== trimmed,
    showResults: isResultsOpen && trimmed.length > 0,
    type: (value: string) => {
      setQuery(value);
      setIsResultsOpen(true);
    },
    focus: () => setIsResultsOpen(true),
    submit: (e: React.FormEvent) => {
      e.preventDefault();
      if (!trimmed) return;
      void navigate({ to: "/search", search: { q: trimmed } });
      close();
    },
  };
}

export type SearchBox = ReturnType<typeof useSearchBox>;
