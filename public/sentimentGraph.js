import * as GraphController from "./controller/graph_controller.js";
import * as Constant from "./model/constant.js";
import * as Element from "./viewpage/element.js";

window.onload = () => {
  const pathname = window.location.pathname;
  // const href = window.location.href;

  //Build list of tracker buttons
  Constant.trackers.forEach((element) => {
    let btn = document.createElement("button");
    btn.innerHTML = element.symbol;
    btn.name = element.symbol;
    btn.type = "button";
    btn.classList.add("btn");
    btn.classList.add("btn-outline-primary");
    btn.onclick = function () {
      history.pushState(null, null, element.path);
      GraphController.buildGraph(window.location.pathname);
    };
    Element.divTrackerButtons.appendChild(btn);
  });

  GraphController.buildGraph(pathname);
};

window.addEventListener("popstate", (e) => {
  e.preventDefault();
  const pathname = e.target.location.pathname;
  // const href = e.target.location.href;
  GraphController.buildGraph(pathname);
});
