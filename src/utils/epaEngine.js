// Compatibility shim — new code should import from epaModels/index.js directly.
// This file exists so any external consumers that imported from epaEngine.js continue to work.

export { runEPAPipeline, estimatePossessions, computeGameFactors } from './epaModels/pipeline.js'
