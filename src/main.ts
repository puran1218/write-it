/** 字宝宝 web — app shell, routing, PWA registration. */

import { LibraryStore } from "./library";
import { navigate, onRouteChange, parseHash } from "./router";
import { renderBook } from "./screens/book";
import { renderDetail } from "./screens/detail";
import { renderHome } from "./screens/home";
import { renderPractice } from "./screens/practice";
import { renderSearch } from "./screens/search";
import { renderStrokes } from "./screens/strokes";

const appRoot = document.getElementById("app")!;
const library = new LibraryStore();

function render(): void {
  const route = parseHash();
  appRoot.innerHTML = "";

  switch (route.screen) {
    case "home":
      void renderHome(appRoot, library);
      break;
    case "book":
      void renderBook(appRoot, library);
      break;
    case "search":
      void renderSearch(appRoot);
      break;
    case "detail":
      void renderDetail(appRoot, route.character, library);
      break;
    case "strokes":
      void renderStrokes(appRoot, route.character);
      break;
    case "practice":
      void renderPractice(appRoot, route.character);
      break;
  }
}

// [data-nav] 是跨屏幕的通用导航出口（tab bar、首页卡片等）
document.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-nav]");
  if (!target) {
    return;
  }
  const destination = target.dataset.nav;
  if (destination === "home") {
    navigate({ screen: "home" });
  } else if (destination === "book") {
    navigate({ screen: "book" });
  } else if (destination === "search") {
    navigate({ screen: "search" });
  }
});

onRouteChange(render);
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // 离线缓存失败不影响使用
    });
  });
}
