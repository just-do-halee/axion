"use strict";
// src/utils/errors.ts
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeError = exports.DerivationError = exports.CircularDependencyError = exports.DependencyError = exports.PathError = exports.StateError = exports.AxionError = exports.ErrorCode = void 0;
exports.registerErrorHandler = registerErrorHandler;
exports.setErrorHandler = setErrorHandler;
exports.handleError = handleError;
exports.createStateError = createStateError;
exports.createPathError = createPathError;
exports.createDependencyError = createDependencyError;
exports.createDerivationError = createDerivationError;
exports.createTimeError = createTimeError;
exports.createError = createError;
exports.logError = logError;
/**
 * Error codes for the Axion library
 */
var ErrorCode;
(function (ErrorCode) {
    // General errors
    ErrorCode["UNKNOWN"] = "UNKNOWN";
    ErrorCode["INVALID_OPERATION"] = "INVALID_OPERATION";
    // State-related errors
    ErrorCode["STATE_ERROR"] = "STATE_ERROR";
    ErrorCode["ATOM_NOT_FOUND"] = "ATOM_NOT_FOUND";
    // Path-related errors
    ErrorCode["PATH_ERROR"] = "PATH_ERROR";
    ErrorCode["INVALID_PATH"] = "INVALID_PATH";
    // Dependency-related errors
    ErrorCode["DEPENDENCY_ERROR"] = "DEPENDENCY_ERROR";
    ErrorCode["CIRCULAR_DEPENDENCY"] = "CIRCULAR_DEPENDENCY";
    // Derived state errors
    ErrorCode["DERIVATION_ERROR"] = "DERIVATION_ERROR";
    // Time travel errors
    ErrorCode["TIME_ERROR"] = "TIME_ERROR";
    ErrorCode["INVALID_SNAPSHOT"] = "INVALID_SNAPSHOT";
    // Subscription errors
    ErrorCode["SUBSCRIPTION_ERROR"] = "SUBSCRIPTION_ERROR";
    // Transaction errors
    ErrorCode["TRANSACTION_ERROR"] = "TRANSACTION_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
/**
 * Base error class for all Axion errors
 */
var AxionError = /** @class */ (function (_super) {
    __extends(AxionError, _super);
    /**
     * Creates a new Axion error
     * @param code The error code
     * @param message The error message
     * @param cause The underlying cause (if any)
     */
    function AxionError(code, message, cause) {
        var _this = _super.call(this, "[".concat(code, "] ").concat(message)) || this;
        _this.code = code;
        _this.cause = cause;
        _this.name = _this.constructor.name;
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, _this.constructor);
        }
        return _this;
    }
    return AxionError;
}(Error));
exports.AxionError = AxionError;
/**
 * Error type for state-related errors
 */
var StateError = /** @class */ (function (_super) {
    __extends(StateError, _super);
    function StateError(code, message, atomId, cause) {
        var _this = _super.call(this, code, message, cause) || this;
        _this.atomId = atomId;
        return _this;
    }
    Object.defineProperty(StateError.prototype, "severity", {
        get: function () {
            return "error";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StateError.prototype, "recoverable", {
        get: function () {
            return false;
        },
        enumerable: false,
        configurable: true
    });
    return StateError;
}(AxionError));
exports.StateError = StateError;
/**
 * Error type for path-related errors
 */
var PathError = /** @class */ (function (_super) {
    __extends(PathError, _super);
    function PathError(code, message, path, cause) {
        var _this = _super.call(this, code, "Invalid path [".concat(path.join("."), "]: ").concat(message), cause) || this;
        _this.path = path;
        return _this;
    }
    Object.defineProperty(PathError.prototype, "severity", {
        get: function () {
            return "warning";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PathError.prototype, "recoverable", {
        get: function () {
            return true;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Gets a valid fallback path (empty path)
     */
    PathError.prototype.getValidPath = function () {
        return [];
    };
    return PathError;
}(AxionError));
exports.PathError = PathError;
/**
 * Error type for dependency-related errors
 */
var DependencyError = /** @class */ (function (_super) {
    __extends(DependencyError, _super);
    function DependencyError(code, message, cause) {
        return _super.call(this, code, message, cause) || this;
    }
    Object.defineProperty(DependencyError.prototype, "severity", {
        get: function () {
            return "error";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DependencyError.prototype, "recoverable", {
        get: function () {
            return false;
        },
        enumerable: false,
        configurable: true
    });
    return DependencyError;
}(AxionError));
exports.DependencyError = DependencyError;
/**
 * Specific error for circular dependencies
 */
var CircularDependencyError = /** @class */ (function (_super) {
    __extends(CircularDependencyError, _super);
    function CircularDependencyError(message, dependencyCycle) {
        var _this = _super.call(this, ErrorCode.CIRCULAR_DEPENDENCY, message) || this;
        _this.dependencyCycle = dependencyCycle;
        return _this;
    }
    Object.defineProperty(CircularDependencyError.prototype, "severity", {
        get: function () {
            return "fatal";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CircularDependencyError.prototype, "recoverable", {
        get: function () {
            return false;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Gets a visual representation of the dependency cycle
     */
    CircularDependencyError.prototype.getDepGraph = function () {
        return this.dependencyCycle.map(String).join(" -> ");
    };
    return CircularDependencyError;
}(AxionError));
exports.CircularDependencyError = CircularDependencyError;
/**
 * Error type for derivation-related errors
 */
var DerivationError = /** @class */ (function (_super) {
    __extends(DerivationError, _super);
    function DerivationError(message, atomId, cause) {
        var _this = _super.call(this, ErrorCode.DERIVATION_ERROR, message, cause) || this;
        _this.atomId = atomId;
        return _this;
    }
    Object.defineProperty(DerivationError.prototype, "severity", {
        get: function () {
            return "error";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DerivationError.prototype, "recoverable", {
        get: function () {
            return true;
        },
        enumerable: false,
        configurable: true
    });
    return DerivationError;
}(AxionError));
exports.DerivationError = DerivationError;
/**
 * Error type for time travel related errors
 */
var TimeError = /** @class */ (function (_super) {
    __extends(TimeError, _super);
    function TimeError(code, message, cause) {
        return _super.call(this, code, message, cause) || this;
    }
    Object.defineProperty(TimeError.prototype, "severity", {
        get: function () {
            return "warning";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TimeError.prototype, "recoverable", {
        get: function () {
            return true;
        },
        enumerable: false,
        configurable: true
    });
    return TimeError;
}(AxionError));
exports.TimeError = TimeError;
var errorHandlers = new Map();
// Default error handler
var defaultErrorHandler = function (error) {
    console.error("[Axion] ".concat(error.message), error.cause || "");
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
function registerErrorHandler(errorType, handler) {
    errorHandlers.set(errorType, handler);
    return function () { return errorHandlers.delete(errorType); };
}
/**
 * Sets the default error handler
 * @param handler The handler function
 */
function setErrorHandler(handler) {
    defaultErrorHandler = handler;
}
/**
 * Handles an error using the appropriate handler
 * @param error The error to handle
 * @returns The error (for chaining)
 */
function handleError(error) {
    var handler = errorHandlers.get(error.constructor.name) || defaultErrorHandler;
    handler(error);
    return error;
}
// Error factory functions for consistent error creation
/**
 * Creates a state error
 */
function createStateError(code, message, atomId, cause) {
    return new StateError(code, message, atomId, cause);
}
/**
 * Creates a path error
 */
function createPathError(code, path, message, cause) {
    return new PathError(code, message, path, cause);
}
/**
 * Creates a dependency error
 */
function createDependencyError(code, message, cause) {
    return new DependencyError(code, message, cause);
}
/**
 * Creates a derivation error
 */
function createDerivationError(message, atomId, cause) {
    return new DerivationError(message, atomId, cause);
}
/**
 * Creates a time error
 */
function createTimeError(code, message, cause) {
    return new TimeError(code, message, cause);
}
/**
 * Legacy function for backward compatibility
 * @deprecated Use the specific error creation functions instead
 */
function createError(code, message, cause) {
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
function logError(error) {
    return handleError(error);
}
