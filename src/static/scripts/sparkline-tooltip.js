/*
  Tooltip for the stake-trend bar chart. Each bar has a full-column
  transparent hit-target with data-epoch + data-stake + data-delta +
  data-delta-dir. We render a styled card that fades in above the bar
  and follows it on hover/focus. Native <title> stays inside the rect
  for screen readers + OS-level fallback.

  Show/hide uses a CSS opacity transition driven by data-visible="1"
  rather than the hidden attribute, so the entrance/exit is smooth.
*/

const container = document.querySelector(".stake-trend");
const tooltip = container?.querySelector(".sp-tooltip");
if (container && tooltip) {
  const epochEl = tooltip.querySelector(".sp-tt-epoch");
  const stakeEl = tooltip.querySelector(".sp-tt-stake");
  const deltaEl = tooltip.querySelector(".sp-tt-delta");

  // CSS handles fade via [data-visible="1"]; make sure tooltip is in DOM
  // (not hidden attr) so we can measure its size for positioning.
  tooltip.hidden = false;
  tooltip.dataset.visible = "0";

  let hideTimer = null;

  const show = (target) => {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    const ep = target.dataset.epoch;
    const ada = target.dataset.stake;
    const delta = target.dataset.delta || "";
    const dir = target.dataset.deltaDir || "flat";
    if (!ep || !ada) return;
    epochEl.textContent = `Epoch ${ep}`;
    stakeEl.textContent = ada;
    deltaEl.textContent = delta;
    deltaEl.className = `sp-tt-delta ${dir}`;
    // Position: center above the bar, clamped to the container.
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const cx = tRect.left - cRect.left + tRect.width / 2;
    const cy = tRect.top - cRect.top;
    const ttW = tooltip.offsetWidth;
    const ttH = tooltip.offsetHeight;
    const x = Math.max(4, Math.min(cRect.width - ttW - 4, cx - ttW / 2));
    const y = Math.max(4, cy - ttH - 14);
    tooltip.style.transform = `translate(${x}px, ${y}px)`;
    tooltip.dataset.visible = "1";
  };

  const hide = () => {
    // Small grace period so quickly moving between bars doesn't flicker.
    hideTimer = setTimeout(() => { tooltip.dataset.visible = "0"; }, 80);
  };

  container.addEventListener("pointerover", (e) => {
    const t = e.target.closest(".sp-hit");
    if (t) show(t);
  });
  container.addEventListener("pointerleave", hide);
  container.addEventListener("focusin", (e) => {
    const t = e.target.closest(".sp-hit");
    if (t) show(t);
  });
  container.addEventListener("focusout", () => hide());
}
