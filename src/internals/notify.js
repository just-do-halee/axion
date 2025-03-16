"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableNotificationDebug = enableNotificationDebug;
exports.disableNotificationDebug = disableNotificationDebug;
exports.notifyStateChange = notifyStateChange;
var batch_1 = require("./batch");
var path_1 = require("../utils/path");
var errors_1 = require("../utils/errors");
/**
 * Event counter for debugging
 */
var notificationCounter = 0;
/**
 * Debug mode enabled flag
 */
var debugMode = process.env.NODE_ENV !== "production";
/**
 * Enable detailed notification debugging
 */
function enableNotificationDebug() {
    debugMode = true;
}
/**
 * Disable detailed notification debugging
 */
function disableNotificationDebug() {
    debugMode = process.env.NODE_ENV !== "production";
}
/**
 * Calculates all affected paths from a set of changed paths
 * This ensures that subscribers to parent paths are notified
 * of changes to child paths.
 *
 * @param changedPaths The directly changed paths
 * @returns A set of all affected path strings
 */
function calculateAffectedPaths(changedPaths) {
    var affectedPathStrings = new Set();
    // Root path is always affected
    affectedPathStrings.add("");
    // Process each changed path
    for (var _i = 0, changedPaths_1 = changedPaths; _i < changedPaths_1.length; _i++) {
        var changedPath = changedPaths_1[_i];
        // Convert full path to string once
        var fullPathStr = (0, path_1.pathToString)(changedPath);
        affectedPathStrings.add(fullPathStr);
        // Add all parent paths - fixed implementation
        // We start with empty path and gradually build up to the full path
        var currentPath = [];
        for (var i = 0; i < changedPath.length; i++) {
            currentPath = __spreadArray(__spreadArray([], currentPath, true), [changedPath[i]], false);
            var currentPathStr = (0, path_1.pathToString)(currentPath);
            affectedPathStrings.add(currentPathStr);
        }
    }
    return affectedPathStrings;
}
/**
 * Notifies subscribers of state changes
 *
 * @param atomId The ID of the atom that changed
 * @param changedPaths The paths that changed
 * @param globalSubscribers Subscribers to the entire atom
 * @param pathSubscribers Subscribers to specific paths
 */
function notifyStateChange(atomId, changedPaths, globalSubscribers, pathSubscribers) {
    // Skip if there are no subscribers of any kind
    if (globalSubscribers.size === 0 &&
        (!pathSubscribers || pathSubscribers.size === 0)) {
        return;
    }
    // Skip if there are no changed paths
    if (changedPaths.size === 0) {
        return;
    }
    // Generate a notification ID for debugging
    var notificationId = ++notificationCounter;
    // Debug logging
    if (debugMode) {
        console.debug("[Axion] [".concat(notificationId, "] State change in atom ").concat(String(atomId)), {
            changedPaths: Array.from(changedPaths).map(path_1.pathToString),
            subscribers: globalSubscribers.size,
            pathSubscribers: (pathSubscribers === null || pathSubscribers === void 0 ? void 0 : pathSubscribers.size) || 0,
        });
    }
    var executeNotification = function () {
        // Track start time for debugging
        var startTime = debugMode ? performance.now() : 0;
        // Collect all subscribers to notify
        var subscribersToNotify = new Set();
        // Add global subscribers first
        for (var _i = 0, globalSubscribers_1 = globalSubscribers; _i < globalSubscribers_1.length; _i++) {
            var subscriber = globalSubscribers_1[_i];
            subscribersToNotify.add(subscriber);
        }
        // No path subscribers? We're done with collection
        if (!pathSubscribers || pathSubscribers.size === 0) {
            // Skip to notification
        }
        else {
            // Calculate all affected paths
            var affectedPathStrings = calculateAffectedPaths(changedPaths);
            if (debugMode) {
                console.debug("[Axion] [".concat(notificationId, "] Affected paths:"), Array.from(affectedPathStrings));
            }
            // Process path subscribers
            for (var _a = 0, _b = pathSubscribers.entries(); _a < _b.length; _a++) {
                var _c = _b[_a], pathStr = _c[0], subscribers = _c[1];
                // Check if this path is directly affected (string comparison)
                if (affectedPathStrings.has(pathStr)) {
                    // Add all subscribers for this path
                    for (var _d = 0, subscribers_1 = subscribers; _d < subscribers_1.length; _d++) {
                        var subscriber = subscribers_1[_d];
                        subscribersToNotify.add(subscriber);
                    }
                }
                else {
                    // For paths not directly included in affectedPathStrings,
                    // we need to check for relationships that the string comparison might miss
                    var pathSegments = (0, path_1.stringToPath)(pathStr);
                    // Check if any changed path is related to this subscription path
                    var isRelated = false;
                    for (var _e = 0, changedPaths_2 = changedPaths; _e < changedPaths_2.length; _e++) {
                        var changedPath = changedPaths_2[_e];
                        if ((0, path_1.areRelatedPaths)(pathSegments, changedPath)) {
                            isRelated = true;
                            break;
                        }
                    }
                    if (isRelated) {
                        // This subscription path is related to a changed path
                        for (var _f = 0, subscribers_2 = subscribers; _f < subscribers_2.length; _f++) {
                            var subscriber = subscribers_2[_f];
                            subscribersToNotify.add(subscriber);
                        }
                    }
                }
            }
        }
        // Notify all collected subscribers
        var notifiedCount = 0;
        var errorCount = 0;
        var subscriberArray = Array.from(subscribersToNotify);
        // Make a copy to prevent issues if subscribers modify the collection
        for (var _g = 0, subscriberArray_1 = subscriberArray; _g < subscriberArray_1.length; _g++) {
            var subscriber = subscriberArray_1[_g];
            try {
                subscriber();
                notifiedCount++;
            }
            catch (error) {
                errorCount++;
                (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.SUBSCRIPTION_ERROR, "Error in subscriber for atom ".concat(String(atomId)), undefined, error));
            }
        }
        // Debug logging
        if (debugMode) {
            var endTime = performance.now();
            console.debug("[Axion] [".concat(notificationId, "] Notification complete"), {
                atomId: String(atomId),
                duration: "".concat((endTime - startTime).toFixed(2), "ms"),
                subscribersNotified: notifiedCount,
                errors: errorCount,
            });
        }
    };
    // Execute the notification with proper batching
    if ((0, batch_1.isBatching)()) {
        (0, batch_1.scheduleBatchedEffect)(executeNotification);
        if (debugMode) {
            console.debug("[Axion] [".concat(notificationId, "] Notification scheduled (batched)"));
        }
    }
    else {
        if (debugMode) {
            console.debug("[Axion] [".concat(notificationId, "] Notification executing immediately"));
        }
        executeNotification();
    }
}
