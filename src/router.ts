/** Hash router — works on any static subpath (micro.blog serves the plugin at /zi/). */

export type Route =
  | { screen: "home" }
  | { screen: "book" }
  | { screen: "search" }
  | { screen: "detail"; character: string }
  | { screen: "strokes"; character: string };

export function parseHash(): Route {
  const hash = decodeURI(window.location.hash.replace(/^#/, ""));
  const segments = hash.split("/").filter(Boolean);

  switch (segments[0]) {
    case undefined:
      return { screen: "home" };
    case "book":
      return { screen: "book" };
    case "search":
      return { screen: "search" };
    case "detail":
      return segments[1]
        ? { screen: "detail", character: segments[1] }
        : { screen: "home" };
    case "strokes":
      return segments[1]
        ? { screen: "strokes", character: segments[1] }
        : { screen: "home" };
    default:
      return { screen: "home" };
  }
}

export function toHash(route: Route): string {
  switch (route.screen) {
    case "home":
      return "#/";
    case "book":
      return "#/book";
    case "search":
      return "#/search";
    case "detail":
      return `#/detail/${encodeURI(route.character)}`;
    case "strokes":
      return `#/strokes/${encodeURI(route.character)}`;
  }
}

let navigatedInternally = false;

export function navigate(route: Route): void {
  navigatedInternally = true;
  const target = toHash(route);
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = target;
}

/** Dismiss-style back: use browser history when we pushed, otherwise go home. */
export function goBack(): void {
  if (navigatedInternally && window.history.length > 1) {
    window.history.back();
  } else {
    navigate({ screen: "home" });
  }
}

export function onRouteChange(handler: (route: Route) => void): void {
  window.addEventListener("hashchange", () => handler(parseHash()));
}
