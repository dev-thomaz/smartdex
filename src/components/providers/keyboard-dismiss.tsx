"use client";

import { useEffect } from "react";

/** Input types that open the on-screen keyboard. */
const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "number", "tel", "url", "password"]);

/** Finger travel (px) that counts as a scroll rather than a tap. */
const DRAG_THRESHOLD = 10;

export function isKeyboardField(el: Element | null): el is HTMLElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable === true;
}

/**
 * Closes the on-screen keyboard when the user drags to scroll, as native apps do.
 * Listens to touch drags instead of `scroll`, because the browser itself scrolls the
 * focused field into view when the keyboard opens, and that must not close it again.
 */
export function KeyboardDismiss() {
  useEffect(() => {
    let startY: number | null = null;

    const onStart = (event: TouchEvent) => {
      startY = event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const onMove = (event: TouchEvent) => {
      if (startY === null) return;
      if (Math.abs(event.touches[0].clientY - startY) < DRAG_THRESHOLD) return;
      startY = null;
      const active = document.activeElement;
      // Dragging on the field itself (moving the caret, selecting text) keeps it open.
      if (isKeyboardField(active) && !active.contains(event.target as Node)) active.blur();
    };
    const onEnd = () => {
      startY = null;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  return null;
}
