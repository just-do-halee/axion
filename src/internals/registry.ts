// src/internals/registry.ts
import { AtomId } from "../core/core-types";

// Central atom registry - stores all atoms by ID
const atomRegistry = new Map<AtomId, any>();

/**
 * Get an atom by its ID
 * @param id The atom ID
 * @returns The atom or undefined if not found
 */
export function getAtomById(id: AtomId): any | undefined {
  return atomRegistry.get(id);
}

/**
 * Register an atom in the registry
 * @param id The atom ID
 * @param atom The atom instance
 */
export function registerAtom(id: AtomId, atom: any): void {
  atomRegistry.set(id, atom);
}

/**
 * Unregister an atom from the registry
 * @param id The atom ID
 * @returns true if the atom was in the registry, false otherwise
 */
export function unregisterAtom(id: AtomId): boolean {
  return atomRegistry.delete(id);
}

/**
 * Get the total number of registered atoms
 * @returns The registry size
 */
export function getRegistrySize(): number {
  return atomRegistry.size;
}
