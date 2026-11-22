export const assetUrl = (path: string): string => new URL(path, document.baseURI).href;
