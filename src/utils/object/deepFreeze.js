//--------------------------------------
// Deep Freeze Utility
//--------------------------------------

/**
 * Recursively freezes an object and all nested
 * objects and arrays.
 *
 * @param {Object|Array} value
 * @returns {Object|Array}
 */
function deepFreeze(value) {
    // Ignore null and primitive values
    if (value === null || typeof value !== "object") {
        return value;
    }

    // Freeze nested properties first
    Object.getOwnPropertyNames(value).forEach((property) => {
        const nestedValue = value[property];

        if (
            nestedValue !== null &&
            typeof nestedValue === "object" &&
            !Object.isFrozen(nestedValue)
        ) {
            deepFreeze(nestedValue);
        }
    });

    // Freeze the current object
    return Object.freeze(value);
}

//--------------------------------------
// Export
//--------------------------------------

export { deepFreeze };