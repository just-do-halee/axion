// src/utils/errors.ts

/**
 * Error codes for the Axion library
 */
export enum ErrorCode {
  // General errors
  UNKNOWN = "UNKNOWN",
  INVALID_OPERATION = "INVALID_OPERATION",

  // State-related errors
  STATE_ERROR = "STATE_ERROR",
  ATOM_NOT_FOUND = "ATOM_NOT_FOUND",

  // Path-related errors
  PATH_ERROR = "PATH_ERROR",
  INVALID_PATH = "INVALID_PATH",

  // Dependency-related errors
  DEPENDENCY_ERROR = "DEPENDENCY_ERROR",
  CIRCULAR_DEPENDENCY = "CIRCULAR_DEPENDENCY",

  // Derived state errors
  DERIVATION_ERROR = "DERIVATION_ERROR",

  // Time travel errors
  TIME_ERROR = "TIME_ERROR",
  INVALID_SNAPSHOT = "INVALID_SNAPSHOT",

  // Subscription errors
  SUBSCRIPTION_ERROR = "SUBSCRIPTION_ERROR",

  // Transaction errors
  TRANSACTION_ERROR = "TRANSACTION_ERROR",
}

/**
 * Base error class for all Axion errors
 */
export abstract class AxionError extends Error {
  /**
   * Creates a new Axion error
   * @param code The error code
   * @param message The error message
   * @param cause The underlying cause (if any)
   */
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`[${code}] ${message}`);
    this.name = this.constructor.name;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Gets the severity level of the error
   */
  abstract get severity(): "fatal" | "error" | "warning";

  /**
   * Indicates if the error can be recovered from
   */
  abstract get recoverable(): boolean;
}

/**
 * Error type for state-related errors
 */
export class StateError extends AxionError {
  constructor(
    code: ErrorCode,
    message: string,
    public readonly atomId?: symbol,
    cause?: unknown
  ) {
    super(code, message, cause);
  }

  get severity(): "fatal" | "error" | "warning" {
    return "error";
  }

  get recoverable(): boolean {
    return false;
  }
}

/**
 * Error type for path-related errors
 */
export class PathError extends AxionError {
  constructor(
    code: ErrorCode,
    message: string,
    public readonly path: Array<string | number | symbol>,
    cause?: unknown
  ) {
    super(code, `Invalid path [${path.join(".")}]: ${message}`, cause);
  }

  get severity(): "fatal" | "error" | "warning" {
    return "warning";
  }

  get recoverable(): boolean {
    return true;
  }

  /**
   * Gets a valid fallback path (empty path)
   */
  getValidPath(): Array<string | number | symbol> {
    return [];
  }
}

/**
 * Error type for dependency-related errors
 */
export class DependencyError extends AxionError {
  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(code, message, cause);
  }

  get severity(): "fatal" | "error" | "warning" {
    return "error";
  }

  get recoverable(): boolean {
    return false;
  }
}

/**
 * Specific error for circular dependencies
 */
export class CircularDependencyError extends AxionError {
  constructor(message: string, public readonly dependencyCycle: symbol[]) {
    super(ErrorCode.CIRCULAR_DEPENDENCY, message);
  }

  get severity(): "fatal" | "error" | "warning" {
    return "fatal";
  }

  get recoverable(): boolean {
    return false;
  }

  /**
   * Gets a visual representation of the dependency cycle
   */
  getDepGraph(): string {
    return this.dependencyCycle.map(String).join(" -> ");
  }
}

/**
 * Error type for derivation-related errors
 */
export class DerivationError extends AxionError {
  constructor(
    message: string,
    public readonly atomId?: symbol,
    cause?: unknown
  ) {
    super(ErrorCode.DERIVATION_ERROR, message, cause);
  }

  get severity(): "fatal" | "error" | "warning" {
    return "error";
  }

  get recoverable(): boolean {
    return true;
  }
}

/**
 * Error type for time travel related errors
 */
export class TimeError extends AxionError {
  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(code, message, cause);
  }

  get severity(): "fatal" | "error" | "warning" {
    return "warning";
  }

  get recoverable(): boolean {
    return true;
  }
}

// Global error handlers
type ErrorHandler = (error: AxionError) => void;
const errorHandlers = new Map<string, ErrorHandler>();

// Default error handler
let defaultErrorHandler = (error: AxionError): void => {
  console.error(`[Axion] ${error.message}`, error.cause || "");

  // Rethrow fatal errors
  if (error.severity === "fatal" && !error.recoverable) {
    throw error;
  }
};

/**
 * Registers an error handler for a specific error type
 * @param errorType The name of the error class to handle
 * @param handler The handler function
 * @returns A function to unregister the handler
 */
export function registerErrorHandler(
  errorType: string,
  handler: ErrorHandler
): () => void {
  errorHandlers.set(errorType, handler);
  return () => errorHandlers.delete(errorType);
}

/**
 * Sets the default error handler
 * @param handler The handler function
 */
export function setErrorHandler(handler: ErrorHandler): void {
  defaultErrorHandler = handler;
}

/**
 * Handles an error using the appropriate handler
 * @param error The error to handle
 * @returns The error (for chaining)
 */
export function handleError(error: AxionError): AxionError {
  const handler =
    errorHandlers.get(error.constructor.name) || defaultErrorHandler;
  handler(error);
  return error;
}

// Error factory functions for consistent error creation

/**
 * Creates a state error
 */
export function createStateError(
  code: ErrorCode,
  message: string,
  atomId?: symbol,
  cause?: unknown
): StateError {
  return new StateError(code, message, atomId, cause);
}

/**
 * Creates a path error
 */
export function createPathError(
  code: ErrorCode,
  path: Array<string | number | symbol>,
  message: string,
  cause?: unknown
): PathError {
  return new PathError(code, message, path, cause);
}

/**
 * Creates a dependency error
 */
export function createDependencyError(
  code: ErrorCode,
  message: string,
  cause?: unknown
): DependencyError {
  return new DependencyError(code, message, cause);
}

/**
 * Creates a derivation error
 */
export function createDerivationError(
  message: string,
  atomId?: symbol,
  cause?: unknown
): DerivationError {
  return new DerivationError(message, atomId, cause);
}

/**
 * Creates a time error
 */
export function createTimeError(
  code: ErrorCode,
  message: string,
  cause?: unknown
): TimeError {
  return new TimeError(code, message, cause);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use the specific error creation functions instead
 */
export function createError(
  code: ErrorCode,
  message: string,
  cause?: unknown
): AxionError {
  // Determine the appropriate error type based on code
  switch (code) {
    case ErrorCode.STATE_ERROR:
    case ErrorCode.ATOM_NOT_FOUND:
      return createStateError(code, message, undefined, cause);

    case ErrorCode.PATH_ERROR:
    case ErrorCode.INVALID_PATH:
      return createPathError(code, [], message, cause);

    case ErrorCode.DEPENDENCY_ERROR:
      return createDependencyError(code, message, cause);

    case ErrorCode.DERIVATION_ERROR:
      return createDerivationError(message, undefined, cause);

    case ErrorCode.TIME_ERROR:
    case ErrorCode.INVALID_SNAPSHOT:
      return createTimeError(code, message, cause);

    default:
      return new StateError(code, message, undefined, cause);
  }
}

/**
 * Logs an error and returns it
 * @param error The error to log
 * @returns The same error
 * @deprecated Use handleError instead
 */
export function logError(error: AxionError): AxionError {
  return handleError(error);
}