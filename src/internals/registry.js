"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAtomById = getAtomById;
exports.registerAtom = registerAtom;
exports.unregisterAtom = unregisterAtom;
exports.getRegistrySize = getRegistrySize;
// Central atom registry - stores all atoms by ID
var atomRegistry = new Map();
/**
 * Get an atom by its ID
 * @param id The atom ID
 * @returns The atom or undefined if not found
 */
function getAtomById(id) {
    return atomRegistry.get(id);
}
/**
 * Register an atom in the registry
 * @param id The atom ID
 * @param atom The atom instance
 */
function registerAtom(id, atom) {
    atomRegistry.set(id, atom);
}
/**
 * Unregister an atom from the registry
 * @param id The atom ID
 * @returns true if the atom was in the registry, false otherwise
 */
function unregisterAtom(id) {
    return atomRegistry.delete(id);
}
/**
 * Get the total number of registered atoms
 * @returns The registry size
 */
function getRegistrySize() {
    return atomRegistry.size;
}
