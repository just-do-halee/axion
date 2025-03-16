/**
 * Tests for debug utilities
 */

import * as registryModule from '../internals/registry';
import { createAtom } from '../core/atom';
import debug from '../debug';

// Need to mock the entire registry module
jest.mock('../internals/registry');

describe('Debug utilities', () => {
  // Store original environment
  const originalNodeEnv = process.env.NODE_ENV;
  
  // Store original console methods
  const originalConsoleDebug = console.debug;
  const originalConsoleLog = console.log;
  
  // Flag to track environment
  let isWindow = false;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console methods
    console.debug = jest.fn();
    console.log = jest.fn();
    
    // Set development environment 
    process.env.NODE_ENV = 'development';
    
    // Check if window is available (for testing global exposure)
    if (typeof window !== 'undefined') {
      isWindow = true;
      // Clear any previous debug utils
      (window as any).__AXION_DEBUG__ = undefined;
    }
  });
  
  afterEach(() => {
    // Restore environment
    process.env.NODE_ENV = originalNodeEnv;
    
    // Restore console methods
    console.debug = originalConsoleDebug;
    console.log = originalConsoleLog;
  });
  
  describe('debug object', () => {
    test('should have getAtomById function', () => {
      const atom = createAtom({ value: 'test' });
      
      // Mock registry to return our atom
      (registryModule.getAtomById as jest.Mock).mockReturnValue(atom);
      
      // Check getAtomById function
      const result = debug.getAtomById(atom.id);
      
      expect(registryModule.getAtomById).toHaveBeenCalledWith(atom.id);
      expect(result).toBe(atom);
    });
    
    test('should provide getDependencyGraph function', () => {
      // Get dependency graph
      const graph = debug.getDependencyGraph();
      
      // Should return empty graph structure
      expect(graph).toEqual({
        nodes: [],
        edges: []
      });
    });
    
    test('should provide printAtoms function', () => {
      // Call printAtoms
      debug.printAtoms();
      
      // In test mode it should just log a message
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('development mode')
      );
    });
  });
  
  // Only run if window is available (like in browser environment)
  (isWindow ? describe : describe.skip)('Global exposure', () => {
    test('should expose debug utils globally in development mode', () => {
      // Import debug module to trigger the global assignment
      jest.resetModules();
      require('../debug');
      
      // Check window.__AXION_DEBUG__
      expect((window as any).__AXION_DEBUG__).toBeDefined();
      expect(typeof (window as any).__AXION_DEBUG__.getAtomById).toBe('function');
    });
  });
});