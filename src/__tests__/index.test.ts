/**
 * Tests for main Axion public API
 */

// Mock the debug module first to prevent window errors
jest.mock("../debug", () => ({
  createDebugUtils: jest.fn().mockReturnValue({
    getAtomById: jest.fn(),
    getDependencyGraph: jest.fn().mockReturnValue({ nodes: [], edges: [] }),
    getStats: jest
      .fn()
      .mockReturnValue({ atoms: 0, derived: 0, subscriptions: 0 }),
  }),
}));

import axion from "../index";
import { createAtom } from "../core/atom";
import { createDerived } from "../core/derive";
import { createEffect } from "../core/effect";
import { transaction } from "../core/transaction";
import { getTimeAPI } from "../time/history";
import { setErrorHandler } from "../utils/errors";

// Mock time modules since we're not testing them directly here
jest.mock("../time/history", () => ({
  getTimeAPI: jest.fn().mockReturnValue({ mockTimeAPI: true }),
}));

describe("Axion Public API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("axion function", () => {
    test("should create an atom", () => {
      const state = axion({ count: 0 });

      expect(state).toBeDefined();
      expect(state.get).toBeDefined();
      expect(state.set).toBeDefined();
      expect(state.update).toBeDefined();
      expect(state.at).toBeDefined();
      expect(state.subscribe).toBeDefined();
      expect(state.get()).toEqual({ count: 0 });
    });

    test("should pass options to createAtom", () => {
      const equals = jest.fn().mockReturnValue(true);
      const options = { name: "testAtom", equals, devtools: true };

      const state = axion({ value: 42 }, options);

      // Update with same value to trigger equals check
      state.set({ value: 42 });

      // Equals function should have been called
      expect(equals).toHaveBeenCalled();
    });
  });

  describe("static methods", () => {
    test("should expose derive method", () => {
      expect(axion.derive).toBe(createDerived);

      // Functional test
      const count = createAtom(2);
      const doubled = axion.derive(() => count.get() * 2);

      expect(doubled.get()).toBe(4);
    });

    test("should expose effect method", () => {
      expect(axion.effect).toBe(createEffect);

      // Functional test
      const effect = jest.fn();
      const cleanup = axion.effect(effect);

      expect(effect).toHaveBeenCalled();
      expect(typeof cleanup).toBe("function");
    });

    test("should expose tx method", () => {
      expect(axion.tx).toBe(transaction);

      // Functional test
      const result = { value: "test" };
      const callback = jest.fn().mockReturnValue(result);

      expect(axion.tx(callback)).toBe(result);
      expect(callback).toHaveBeenCalled();
    });

    test("should expose getTimeAPI method", () => {
      expect(axion.getTimeAPI).toBe(getTimeAPI);

      const atom = createAtom(0);
      const timeAPI = axion.getTimeAPI(atom);

      expect(timeAPI).toEqual({ mockTimeAPI: true });
      expect(getTimeAPI).toHaveBeenCalledWith(atom);
    });

    test("should expose setErrorHandler method", () => {
      expect(axion.setErrorHandler).toBe(setErrorHandler);

      const handler = jest.fn();
      axion.setErrorHandler(handler);

      // We're not testing the error handler itself here
      // since that's tested in the errors.test.ts
    });
  });

  describe("VERSION property", () => {
    test("should expose read-only VERSION property", async () => {
      const version = (await import("../../package.json")).version;

      expect(axion.VERSION).toBe(version);

      // Should be read-only
      const setVersion = () => {
        (axion as any).VERSION = "-.0.0";
      };

      expect(setVersion).toThrow();
      expect(axion.VERSION).toBe(version);
    });
  });
});
