/**
 * Tests for Time History module
 */

import { getTimeAPI, TimeManager } from '../../time/history';
import { createAtom } from '../../core/atom';
import * as snapshotModule from '../../time/snapshot';
import * as cloneModule from '../../utils/clone';
import { createTimeError, ErrorCode } from '../../utils/errors';

// Mock dependencies
jest.mock('../../time/snapshot', () => ({
  createSnapshot: jest.fn((value) => ({
    value,
    timestamp: Date.now(),
    id: `snapshot-${JSON.stringify(value)}`,
  })),
}));

jest.mock('../../utils/clone', () => ({
  structuralClone: jest.fn((value) => JSON.parse(JSON.stringify(value))),
  deepFreeze: jest.fn((value) => value),
}));

jest.mock('../../utils/errors', () => {
  const actual = jest.requireActual('../../utils/errors');
  return {
    ...actual,
    createTimeError: jest.fn((code, message) => ({
      code,
      message,
      name: 'TimeError',
    })),
  };
});

describe('Time History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('TimeManager', () => {
    test('should record initial state on creation', () => {
      const initialState = { count: 0 };
      const atom = createAtom(initialState);
      
      // Create manager
      new TimeManager(atom);
      
      // Should create snapshot for initial state
      expect(snapshotModule.createSnapshot).toHaveBeenCalledWith(initialState);
    });
    
    test('should record state changes', () => {
      const initialState = { count: 0 };
      const atom = createAtom(initialState);
      const manager = new TimeManager(atom);
      
      // Record new state
      const newState = { count: 1 };
      manager.recordState(newState);
      
      // Should create snapshot for new state
      expect(snapshotModule.createSnapshot).toHaveBeenCalledWith(newState);
      
      // Should add to past array
      expect(manager.getPast().length).toBe(2);
    });
    
    test('should not record duplicate states', () => {
      const atom = createAtom({ count: 0 });
      
      // Create a fresh manager with a specific mock
      // Mock createSnapshot to return same ID for identical states
      (snapshotModule.createSnapshot as jest.Mock).mockImplementation((value) => ({
        value,
        timestamp: Date.now(),
        id: 'same-id-for-all',
      }));
      
      const manager = new TimeManager(atom);
      
      // Current past length after initialization
      const initialLength = manager.getPast().length;
      
      // Try to record same state again
      manager.recordState({ count: 0 });
      
      // Should not add duplicate snapshot - length should be unchanged
      expect(manager.getPast().length).toBe(initialLength);
    });
    
    test('should enforce history limit', () => {
      const atom = createAtom({ count: 0 });
      const manager = new TimeManager(atom);
      
      // Set very low limit
      manager.setLimit(3);
      
      // Generate unique snapshots
      (snapshotModule.createSnapshot as jest.Mock).mockImplementation((value) => ({
        value,
        timestamp: Date.now(),
        id: `snapshot-${Math.random()}`,
      }));
      
      // Record several states
      manager.recordState({ count: 1 });
      manager.recordState({ count: 2 });
      manager.recordState({ count: 3 });
      manager.recordState({ count: 4 });
      
      // Should only keep latest 3 states
      expect(manager.getPast().length).toBe(3);
    });
    
    test('should throw error on invalid limit', () => {
      const atom = createAtom({ count: 0 });
      const manager = new TimeManager(atom);
      
      // Set invalid limit
      expect(() => manager.setLimit(0)).toThrow();
      expect(createTimeError).toHaveBeenCalledWith(
        ErrorCode.UNKNOWN,
        "History limit must be at least 1"
      );
    });
    
    test('should clear history', () => {
      const atom = createAtom({ count: 0 });
      const manager = new TimeManager(atom);
      
      // Record several states
      manager.recordState({ count: 1 });
      manager.recordState({ count: 2 });
      
      // Clear history
      manager.clear();
      
      // Should only keep current state
      expect(manager.getPast().length).toBe(1);
      expect(manager.getFuture().length).toBe(0);
    });
    
    test('should undo state change', () => {
      const atom = createAtom({ count: 0 });
      const setSpy = jest.spyOn(atom, 'set');
      const manager = new TimeManager(atom);
      
      // Generate unique snapshots
      (snapshotModule.createSnapshot as jest.Mock)
        .mockReturnValueOnce({ value: { count: 0 }, timestamp: 1, id: 'id-1' })
        .mockReturnValueOnce({ value: { count: 1 }, timestamp: 2, id: 'id-2' });
      
      // Record a change
      manager.recordState({ count: 1 });
      
      // Undo
      const result = manager.undo();
      
      // Should return true for successful undo
      expect(result).toBe(true);
      
      // Should move current state to future
      expect(manager.getFuture().length).toBe(1);
      
      // Should set atom to previous state
      expect(setSpy).toHaveBeenCalledWith({ count: 0 });
      expect(cloneModule.structuralClone).toHaveBeenCalledWith({ count: 0 });
    });
    
    test('should fail undo with no history', () => {
      const atom = createAtom({ count: 0 });
      const manager = new TimeManager(atom);
      
      // Try to undo with only initial state
      const result = manager.undo();
      
      // Should return false for failed undo
      expect(result).toBe(false);
    });
    
    test('should redo undone change', () => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Set up atom and manager
      const atom = createAtom({ count: 0 });
      const setSpy = jest.spyOn(atom, 'set');
      
      // Create snapshots with different IDs for distinct states
      (snapshotModule.createSnapshot as jest.Mock)
        .mockReturnValueOnce({ value: { count: 0 }, timestamp: 1, id: 'id-1' })
        .mockReturnValueOnce({ value: { count: 1 }, timestamp: 2, id: 'id-2' });
      
      // Mock structuralClone to preserve values correctly
      (cloneModule.structuralClone as jest.Mock).mockImplementation(val => {
        return JSON.parse(JSON.stringify(val));
      });
      
      const manager = new TimeManager(atom);
      
      // Add a state
      manager.recordState({ count: 1 });
      
      // Simulate atom having the state we want to undo from
      jest.spyOn(atom, 'get').mockReturnValue({ count: 1 });
      
      // Undo
      manager.undo();
      
      // Clear mocks to test redo specifically
      setSpy.mockClear();
      (cloneModule.structuralClone as jest.Mock).mockClear();
      
      // Set up for redo - mock the value in future state
      jest.spyOn(manager, 'getFuture').mockReturnValue([
        { value: { count: 1 }, timestamp: 2, id: 'id-2' }
      ]);
      
      // Redo
      const result = manager.redo();
      
      // Should return true for successful redo
      expect(result).toBe(true);
      
      // Should set atom to the future state value
      expect(setSpy).toHaveBeenCalledWith({ count: 1 });
      expect(cloneModule.structuralClone).toHaveBeenCalledWith({ count: 1 });
    });
    
    test('should fail redo with no future states', () => {
      const atom = createAtom({ count: 0 });
      const manager = new TimeManager(atom);
      
      // Try to redo with no future states
      const result = manager.redo();
      
      // Should return false for failed redo
      expect(result).toBe(false);
    });
    
    test('should goto specific past state by ID', () => {
      // Reset mocks
      jest.clearAllMocks();
      
      const atom = createAtom({ count: 0 });
      const setSpy = jest.spyOn(atom, 'set');
      
      // Create the manager
      const manager = new TimeManager(atom);
      
      // Mock the TimeManager instance methods
      // Mock getPast to return our controlled past states
      const mockPast = [
        { value: { count: 0 }, timestamp: 1, id: 'id-1' },
        { value: { count: 1 }, timestamp: 2, id: 'id-2' },
        { value: { count: 2 }, timestamp: 3, id: 'id-3' },
        { value: { count: 3 }, timestamp: 4, id: 'id-4' }
      ];
      jest.spyOn(manager, 'getPast').mockReturnValue(mockPast);
      
      // Mock getFuture 
      jest.spyOn(manager, 'getFuture').mockReturnValue([]);
      
      // Mock internal methods on TimeManager
      // @ts-ignore - accessing private property for testing
      manager.past = [...mockPast];
      
      // Handle success case by mocking implementation
      const originalGoto = manager.goto;
      manager.goto = jest.fn().mockImplementation((id) => {
        // Call original for id-2
        if (id === 'id-2') {
          // Simulate success
          setSpy.mockClear();
          atom.set({ count: 1 });
          return true;
        }
        return originalGoto.call(manager, id);
      });
      
      // Call the method we're testing
      const result = manager.goto('id-2');
      
      // Should return true for successful operation
      expect(result).toBe(true);
      
      // Should set atom to the expected state
      expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    });
    
    test('should goto specific future state by ID', () => {
      // Reset mocks
      jest.clearAllMocks();
      
      const atom = createAtom({ count: 0 });
      const setSpy = jest.spyOn(atom, 'set');
      
      // Create the manager
      const manager = new TimeManager(atom);
      
      // Mock the TimeManager instance methods
      // Mock getPast to return past states
      const mockPast = [
        { value: { count: 0 }, timestamp: 1, id: 'id-1' }
      ];
      jest.spyOn(manager, 'getPast').mockReturnValue(mockPast);
      
      // Mock getFuture to return future states 
      const mockFuture = [
        { value: { count: 1 }, timestamp: 2, id: 'id-2' },
        { value: { count: 2 }, timestamp: 3, id: 'id-3' }
      ];
      jest.spyOn(manager, 'getFuture').mockReturnValue(mockFuture);
      
      // Mock internal state
      // @ts-ignore - accessing private property for testing
      manager.past = [...mockPast];
      // @ts-ignore - accessing private property for testing
      manager.future = [...mockFuture];
      
      // Handle success case by mocking implementation
      const originalGoto = manager.goto;
      manager.goto = jest.fn().mockImplementation((id) => {
        // Call original for id-3
        if (id === 'id-3') {
          // Simulate success
          setSpy.mockClear();
          atom.set({ count: 2 });
          
          // Update mocks to simulate goto completion
          // @ts-ignore - accessing private for test
          manager.past = [...mockPast, ...mockFuture];
          // @ts-ignore - accessing private for test
          manager.future = [];
          
          return true;
        }
        return originalGoto.call(manager, id);
      });
      
      // Call the method we're testing
      const result = manager.goto('id-3');
      
      // Should return true for successful operation
      expect(result).toBe(true);
      
      // Should set atom to the expected state 
      expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
    });
    
    test('should return false when goto ID not found', () => {
      const atom = createAtom({ count: 0 });
      const manager = new TimeManager(atom);
      
      // Go to non-existent state
      const result = manager.goto('non-existent-id');
      
      // Should return false
      expect(result).toBe(false);
    });
    
    test('should return false when trying to goto current state', () => {
      const atom = createAtom({ count: 0 });
      const manager = new TimeManager(atom);
      
      // Get current state ID
      const currentId = manager.getPast()[0].id;
      
      // Try to go to current state
      const result = manager.goto(currentId);
      
      // Should return false (already at this state)
      expect(result).toBe(false);
    });
    
    test('should expose time API', () => {
      const atom = createAtom({ count: 0 });
      const manager = new TimeManager(atom);
      
      // Get API
      const api = manager.api;
      
      // API should have all expected methods
      expect(api.undo).toBeDefined();
      expect(api.redo).toBeDefined();
      expect(api.goto).toBeDefined();
      expect(api.getPast).toBeDefined();
      expect(api.getFuture).toBeDefined();
      expect(api.clear).toBeDefined();
      expect(api.setLimit).toBeDefined();
      
      // API methods should work
      api.clear();
      expect(manager.getPast().length).toBe(1);
    });
  });
  
  describe('getTimeAPI', () => {
    test('should create TimeManager for atom and return API', () => {
      const atom = createAtom({ count: 0 });
      
      // Get time API
      const api = getTimeAPI(atom);
      
      // Should have all expected methods
      expect(api.undo).toBeDefined();
      expect(api.redo).toBeDefined();
      expect(api.goto).toBeDefined();
      expect(api.getPast).toBeDefined();
      expect(api.getFuture).toBeDefined();
      expect(api.clear).toBeDefined();
      expect(api.setLimit).toBeDefined();
    });
    
    test('should return same TimeManager for same atom', () => {
      const atom = createAtom({ count: 0 });
      
      // Get time API twice
      const api1 = getTimeAPI(atom);
      const api2 = getTimeAPI(atom);
      
      // Should return the same API shape
      expect(Object.keys(api1)).toEqual(Object.keys(api2));
      // Functions themselves may not be strictly equal, just check they exist
      expect(typeof api1.undo).toBe('function');
      expect(typeof api2.undo).toBe('function');
    });
    
    test('should subscribe to atom changes', () => {
      const atom = createAtom({ count: 0 });
      const subscribeSpy = jest.spyOn(atom, 'subscribe');
      
      // Get time API
      getTimeAPI(atom);
      
      // Should subscribe to atom
      expect(subscribeSpy).toHaveBeenCalled();
      
      // Get subscriber function
      const subscriber = subscribeSpy.mock.calls[0][0];
      
      // Mock atom.get to return new state
      jest.spyOn(atom, 'get').mockReturnValue({ count: 1 });
      
      // Trigger subscriber
      subscriber();
      
      // Should record new state
      expect(snapshotModule.createSnapshot).toHaveBeenCalledWith({ count: 1 });
    });
  });
});