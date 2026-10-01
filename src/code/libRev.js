// v2026.10.01.190: counts updates across ALL shared libraries (button / slider / cover / frame), so a
// card or editor taken off the page — and therefore no longer listening — can tell on its return
// whether it missed one. Bumped by each library right before it notifies its listeners.
let _rev = 0;
export function bumpLibRev() { _rev++; }
export function libRev() { return _rev; }
