/**
 * app.js — 10,000 Checkbox Real-time Sync Client
 *
 * Performance strategy:
 *  - Render all 10,000 checkboxes once using a DocumentFragment (single DOM paint).
 *  - Use delta events (only changed index+value) instead of full state diffs.
 *  - Apply remote updates in O(1) via direct array index lookup.
 *  - Use native <input type="checkbox"> — zero abstraction overhead.
 */

const TOTAL = 10000;

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const grid        = document.getElementById("gridContainer");
const resetBtn    = document.getElementById("resetBtn");
const statusDot   = document.getElementById("statusDot");
const statusLabel = document.getElementById("statusLabel");

// ─── Checkbox element registry ───────────────────────────────────────────────
// Direct array of <input> elements for O(1) access by index.
const inputs = new Array(TOTAL);

// ─── Build DOM (one-shot, DocumentFragment for performance) ──────────────────
(function buildGrid() {
  const frag = document.createDocumentFragment();

  for (let i = 0; i < TOTAL; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "cb-item";
    wrapper.id = `w${i}`;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id   = `cb${i}`;

    const lbl = document.createElement("label");
    lbl.htmlFor     = `cb${i}`;
  //  lbl.textContent = `Item ${i}`;

    // ── User clicks this checkbox ──
    cb.addEventListener("change", () => {
      socket.emit("toggle", { index: i, checked: cb.checked });
    });

    wrapper.appendChild(cb);
    wrapper.appendChild(lbl);
    frag.appendChild(wrapper);

    inputs[i] = cb; // register for fast lookup
  }

  grid.appendChild(frag); // single DOM paint
})();

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const socket = io();

socket.on("connect",    () => setStatus("connected",    "Connected"));
socket.on("disconnect", () => setStatus("disconnected", "Disconnected"));
socket.on("reconnecting", () => setStatus("",           "Reconnecting…"));

// ── Full state on first connect ──
socket.on("init", (state) => {
  // Apply all 10k states in one pass — no flash on initial load
  for (let i = 0; i < TOTAL; i++) {
    inputs[i].checked = state[i];
  }
});

// ── Delta update — single checkbox changed by any client ──
socket.on("delta", ({ index, checked }) => {
  const isRemote = inputs[index].checked !== checked;
  inputs[index].checked = checked;
  if (isRemote) flashItem(index);
});

// ── Reset all ──
socket.on("reset", () => {
  for (let i = 0; i < TOTAL; i++) {
    inputs[i].checked = false;
  }
});

// ─── Reset button ─────────────────────────────────────────────────────────────
resetBtn.addEventListener("click", () => socket.emit("resetAll"));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(cls, text) {
  statusDot.className   = `status-dot ${cls}`.trim();
  statusLabel.textContent = text;
}

function flashItem(index) {
  const wrapper = document.getElementById(`w${index}`);
  if (!wrapper) return;
  wrapper.classList.remove("flash");
  void wrapper.offsetWidth; // reflow to restart animation
  wrapper.classList.add("flash");
}