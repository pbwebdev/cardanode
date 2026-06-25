/*
  Tooltip for the stake-trend sparkline. Each data point in the SVG is wrapped
  in a transparent 14px hit-target with data-epoch + data-stake. On
  pointerenter/focus we position a styled div over the SVG container; on
  pointerleave/blur we hide it. Native <title> inside the circle still works
  for screen readers and as a fallback OS tooltip.
*/

const container = document.querySelector(".stake-trend");
const tooltip = container?.querySelector(".sp-tooltip");
if (container && tooltip) {
  const epochEl = tooltip.querySelector(".sp-tt-epoch");
  const stakeEl = tooltip.querySelector(".sp-tt-stake");

  const show = (target) => {
    const ep = target.dataset.epoch;
    const ada = target.dataset.stake;
    if (!ep || !ada) return;
    epochEl.textContent = `Epoch ${ep}`;
    stakeEl.textContent = ada;
    tooltip.hidden = false;
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    // Position centered above the dot, clamped to the container.
    const cx = tRect.left - cRect.left + tRect.width / 2;
    const cy = tRect.top - cRect.top;
    const ttW = tooltip.offsetWidth;
    const ttH = tooltip.offsetHeight;
    const x = Math.max(4, Math.min(cRect.width - ttW - 4, cx - ttW / 2));
    const y = Math.max(4, cy - ttH - 10);
    tooltip.style.transform = `translate(${x}px, ${y}px)`;
  };

  const hide = () => { tooltip.hidden = true; };

  container.addEventListener("pointerover", (e) => {
    const t = e.target.closest(".sp-hit");
    if (t) show(t);
  });
  container.addEventListener("pointerout", (e) => {
    const t = e.target.closest(".sp-hit");
    if (t && !container.contains(e.relatedTarget)) hide();
  });
  container.addEventListener("focusin", (e) => {
    const t = e.target.closest(".sp-hit");
    if (t) show(t);
  });
  container.addEventListener("focusout", (e) => {
    const t = e.target.closest(".sp-hit");
    if (t) hide();
  });
}
