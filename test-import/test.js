"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Test importing from local path
var axion_state_1 = require("axion-state");
var react_1 = require("axion-state/react");
var state = { count: 0 };
var ax = (0, axion_state_1.default)(state);
// Skip React hook in Node environment
// var _ = (0, react_1.useAxion)(ax);

// Test VERSION property
console.log("axion VERSION:", axion_state_1.default.VERSION);
console.log("axion:", axion_state_1.default);
