// Shared context passed to every view module. It carries the mutable draft
// state, the render() entry point, the root #app element, and the small
// helper functions the views need, so the modules never import app.js
// (which would create a circular dependency).
export function createViewContext({ app, state, render, helpers }) {
  return { app, state, render, ...helpers };
}
