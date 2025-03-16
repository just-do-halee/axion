// src/vue.ts - Vue integration

import { ref, watch, computed, onUnmounted, Ref, ComputedRef } from "vue";
// Import directly from core-types to avoid circular dependencies
import type { Atom, PathOperator } from "./core/core-types";

// Re-export core functionality and types for Vue-specific imports
export { createAtom } from "./core/atom";
export { createDerived } from "./core/derive";
export { createEffect } from "./core/effect";

// Re-export the exact same type references
export type { Atom, PathOperator };

/**
 * Vue Composition API hook for Axion state
 * @param source The atom or path operator to subscribe to
 * @returns Vue reactive state
 */
export function useAxion<T>(source: Atom<T> | PathOperator<any, any>): Ref<T> {
  // Check subscription source
  const getterFn = "get" in source ? source.get : () => source;
  const subscribeFn = "subscribe" in source ? source.subscribe : undefined;

  // Create reactive state
  const state = ref(getterFn()) as Ref<T>;

  // State change handler
  const handleChange = () => {
    state.value = getterFn();
  };

  // Setup subscription
  let unsubscribe: (() => void) | undefined;

  if (subscribeFn) {
    unsubscribe = subscribeFn(handleChange);
  }

  // Cleanup subscription on unmount
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  return state;
}

/**
 * Converts an Axion derived state to a Vue computed property
 * @param computeFn The computation function
 * @returns Vue computed reference
 */
export function useAxionComputed<T>(computeFn: () => T): ComputedRef<T> {
  return computed(computeFn);
}

/**
 * Creates a two-way binding for an Axion atom in Vue
 * @param atom The target atom or path operator
 * @returns A two-way bindable ref
 */
export function useAxionModel<T>(
  atom: Atom<T> | PathOperator<any, any>
): Ref<T> {
  const getValue = "get" in atom ? () => atom.get() : () => atom;
  const setValue = "set" in atom ? (v: T) => atom.set(v) : undefined;

  const state = ref(getValue()) as Ref<T>;

  // Setup subscription
  let unsubscribe: (() => void) | undefined;

  if ("subscribe" in atom) {
    unsubscribe = atom.subscribe(() => {
      state.value = getValue();
    });
  }

  // Update atom when state changes
  if (setValue) {
    watch(state, (newValue) => {
      setValue(newValue);
    });
  }

  // Cleanup subscription on unmount
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  return state;
}
