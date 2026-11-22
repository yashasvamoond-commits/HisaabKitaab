
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

if (!('crypto' in globalThis)) {
  // @ts-expect-error test shim
  globalThis.crypto = { randomUUID: () => Math.random().toString(16).slice(2) };
}
