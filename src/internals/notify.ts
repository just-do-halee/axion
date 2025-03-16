// src/internals/notify.ts - Fixed Implementation
import { AtomId } from "../core/core-types";
import { Path } from "../utils/types";
import { isBatching, scheduleBatchedEffect } from "./batch";
import { pathToString, areRelatedPaths, stringToPath } from "../utils/path";
import { createStateError, ErrorCode, handleError } from "../utils/errors";

/**
 * Event counter for debugging
 */
let notificationCounter = 0;

/**
 * Debug mode enabled flag
 */
let debugMode = process.env.NODE_ENV !== "production";

/**
 * Enable detailed notification debugging
 */
export function enableNotificationDebug() {
  debugMode = true;
}

/**
 * Disable detailed notification debugging
 */
export function disableNotificationDebug() {
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
function calculateAffectedPaths(changedPaths: Set<Path>): Set<string> {
  const affectedPathStrings = new Set<string>();

  // Root path is always affected
  affectedPathStrings.add("");

  // Process each changed path
  for (const changedPath of changedPaths) {
    // Convert full path to string once
    const fullPathStr = pathToString(changedPath);
    affectedPathStrings.add(fullPathStr);

    // Add all parent paths - fixed implementation
    // We start with empty path and gradually build up to the full path
    let currentPath: Path = [];
    for (let i = 0; i < changedPath.length; i++) {
      currentPath = [...currentPath, changedPath[i]];
      const currentPathStr = pathToString(currentPath);
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
export function notifyStateChange(
  atomId: AtomId,
  changedPaths: Set<Path>,
  globalSubscribers: Set<() => void>,
  pathSubscribers?: Map<string, Set<() => void>>
): void {
  // Skip if there are no subscribers of any kind
  if (
    globalSubscribers.size === 0 &&
    (!pathSubscribers || pathSubscribers.size === 0)
  ) {
    return;
  }

  // Skip if there are no changed paths
  if (changedPaths.size === 0) {
    return;
  }

  // Generate a notification ID for debugging
  const notificationId = ++notificationCounter;

  // Debug logging
  if (debugMode) {
    console.debug(
      `[Axion] [${notificationId}] State change in atom ${String(atomId)}`,
      {
        changedPaths: Array.from(changedPaths).map(pathToString),
        subscribers: globalSubscribers.size,
        pathSubscribers: pathSubscribers?.size || 0,
      }
    );
  }

  const executeNotification = () => {
    // Track start time for debugging
    const startTime = debugMode ? performance.now() : 0;

    // Collect all subscribers to notify
    const subscribersToNotify = new Set<() => void>();

    // Add global subscribers first
    for (const subscriber of globalSubscribers) {
      subscribersToNotify.add(subscriber);
    }

    // No path subscribers? We're done with collection
    if (!pathSubscribers || pathSubscribers.size === 0) {
      // Skip to notification
    } else {
      // Calculate all affected paths
      const affectedPathStrings = calculateAffectedPaths(changedPaths);

      if (debugMode) {
        console.debug(
          `[Axion] [${notificationId}] Affected paths:`,
          Array.from(affectedPathStrings)
        );
      }

      // Process path subscribers
      for (const [pathStr, subscribers] of pathSubscribers.entries()) {
        // Check if this path is directly affected (string comparison)
        if (affectedPathStrings.has(pathStr)) {
          // Add all subscribers for this path
          for (const subscriber of subscribers) {
            subscribersToNotify.add(subscriber);
          }
        } else {
          // For paths not directly included in affectedPathStrings,
          // we need to check for relationships that the string comparison might miss
          const pathSegments = stringToPath(pathStr);

          // Check if any changed path is related to this subscription path
          let isRelated = false;
          for (const changedPath of changedPaths) {
            if (areRelatedPaths(pathSegments, changedPath)) {
              isRelated = true;
              break;
            }
          }

          if (isRelated) {
            // This subscription path is related to a changed path
            for (const subscriber of subscribers) {
              subscribersToNotify.add(subscriber);
            }
          }
        }
      }
    }

    // Notify all collected subscribers
    let notifiedCount = 0;
    let errorCount = 0;

    const subscriberArray = Array.from(subscribersToNotify);

    // Make a copy to prevent issues if subscribers modify the collection
    for (const subscriber of subscriberArray) {
      try {
        subscriber();
        notifiedCount++;
      } catch (error) {
        errorCount++;
        handleError(
          createStateError(
            ErrorCode.SUBSCRIPTION_ERROR,
            `Error in subscriber for atom ${String(atomId)}`,
            undefined,
            error
          )
        );
      }
    }

    // Debug logging
    if (debugMode) {
      const endTime = performance.now();
      console.debug(`[Axion] [${notificationId}] Notification complete`, {
        atomId: String(atomId),
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        subscribersNotified: notifiedCount,
        errors: errorCount,
      });
    }
  };

  // Execute the notification with proper batching
  if (isBatching()) {
    scheduleBatchedEffect(executeNotification);
    if (debugMode) {
      console.debug(
        `[Axion] [${notificationId}] Notification scheduled (batched)`
      );
    }
  } else {
    if (debugMode) {
      console.debug(
        `[Axion] [${notificationId}] Notification executing immediately`
      );
    }
    executeNotification();
  }
}
