// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { isKeyboardField, KeyboardDismiss } from "@/components/providers/keyboard-dismiss";

afterEach(cleanup);

function setup() {
  render(
    <>
      <KeyboardDismiss />
      <input type="search" aria-label="Buscar" />
      <div data-testid="list">lista</div>
    </>,
  );
  const input = screen.getByLabelText("Buscar");
  input.focus();
  return { input, list: screen.getByTestId("list") };
}

function drag(target: Element, fromY: number, toY: number) {
  fireEvent.touchStart(target, { touches: [{ clientY: fromY }] });
  fireEvent.touchMove(target, { touches: [{ clientY: toY }] });
  fireEvent.touchEnd(target, { touches: [] });
}

describe("keyboard dismiss on scroll", () => {
  it("closes the keyboard when the user drags the page", () => {
    const { input, list } = setup();
    drag(list, 300, 200);
    expect(document.activeElement).not.toBe(input);
  });

  it("keeps the keyboard on taps and small finger movements", () => {
    const { input, list } = setup();
    drag(list, 300, 295);
    expect(document.activeElement).toBe(input);
  });

  it("keeps the keyboard when dragging on the field itself", () => {
    const { input } = setup();
    drag(input, 300, 200);
    expect(document.activeElement).toBe(input);
  });

  it("only treats text fields as keyboard fields", () => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    expect(isKeyboardField(checkbox)).toBe(false);
    expect(isKeyboardField(document.createElement("textarea"))).toBe(true);
    expect(isKeyboardField(document.createElement("button"))).toBe(false);
  });
});
