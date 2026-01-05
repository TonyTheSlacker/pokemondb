// This file is intentionally tiny.
// It loads the app in ordered parts so editing/iteration is faster.
// (Works for both repo root (index.html) and pages/* opened via file://.)
(function () {
  // Boot markers so HTML can detect when JS didn\'t load / init didn\'t run.
  window.__APP_BOOTSTRAPPED__ = true;
  window.__APP_ACTIONS_INSTALLED__ = false;
  window.__APP_INIT_STARTED__ = false;
  window.__APP_INIT_FINISHED__ = false;

  var __isPagesDir = /\/pages\/|\\pages\\/.test(window.location.pathname);
  var __root = __isPagesDir ? "../" : "";

  var __parts = [
    __root + "js/script.part1.js",
    __root + "js/script.part2.js",
    __root + "js/script.part3.js",
    __root + "js/script.part4.js"
  ];

  for (var i = 0; i < __parts.length; i++) {
    document.write("<script src=\"" + __parts[i] + "\"></" + "script>");
  }
})();
