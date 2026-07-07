/// <reference types="jquery" />
/// <reference types="lodash" />
/// <reference types="toastr" />
/// <reference types="type-fest" />

/**
 * Frontend-local entrypoint for standalone runtime-provided globals.
 *
 * Do not reference Tavern/MVU/SillyTavern helper declaration files here. The
 * standalone app should only see the small browser globals it still uses.
 */

type StandaloneEventOnReturn = {
  stop: () => void;
};

declare function eventOn(eventType: string, listener: (...args: any[]) => void): StandaloneEventOnReturn;
