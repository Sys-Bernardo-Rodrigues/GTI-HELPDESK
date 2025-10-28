/**
 * Safely removes a target <div> from the DOM while minimizing layout shifts.
 * - Verifies existence and connectivity in the document
 * - Clears inline event handlers and dataset on the element and its descendants
 * - Removes all child nodes
 * - Replaces the element position with a hidden spacer to preserve layout
 * - Removes the element node and returns true if it no longer exists in the DOM
 *
 * Returns false on invalid input or if removal fails.
 */
export function removeDivElement(div: HTMLDivElement | null): boolean {
  try {
    if (!div || !(div instanceof HTMLDivElement)) return false;

    // 1) Verify element exists in document (or at least is attached somewhere)
    const parent = div.parentNode as (Node & ParentNode) | null;
    if (!parent) return false;

    // 2) Attempt to clear inline event handlers for the element and descendants
    const clearInlineHandlers = (el: Element) => {
      const propNames = [
        "onclick","onchange","oninput","onkeydown","onkeyup","onkeypress",
        "onmousedown","onmouseup","onmouseenter","onmouseleave","onmousemove",
        "onfocus","onblur","onsubmit","onreset","onwheel","ontouchstart",
        "ontouchend","ontouchmove","onpointerdown","onpointerup","onpointermove",
      ];
      for (const p of propNames) {
        // @ts-expect-error - assigning to event handler properties
        (el as any)[p] = null;
        if (p.startsWith("on")) el.removeAttribute(p);
      }
      const he = el as HTMLElement;
      if (he && he.dataset) {
        for (const k of Object.keys(he.dataset)) {
          // @ts-expect-error - deleting dataset keys is fine here for cleanup intent
          delete he.dataset[k];
        }
      }
    };

    const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT);
    // Clear on the root as well
    clearInlineHandlers(div);
    // And for all descendants
    while (walker.nextNode()) {
      const node = walker.currentNode as Element;
      clearInlineHandlers(node);
    }

    // 3) Remove all children (robust fallback for older engines)
    while (div.firstChild) {
      const child = div.firstChild;
      div.removeChild(child);
    }

    // Preserve layout with a hidden spacer of the same block size
    const computed = window.getComputedStyle(div);
    const spacer = document.createElement("div");
    spacer.setAttribute("aria-hidden", "true");
    const height = div.offsetHeight; // includes padding/border
    spacer.style.visibility = "hidden";
    spacer.style.pointerEvents = "none";
    spacer.style.height = `${height}px`;
    spacer.style.marginTop = computed.marginTop;
    spacer.style.marginBottom = computed.marginBottom;
    spacer.style.marginLeft = computed.marginLeft;
    spacer.style.marginRight = computed.marginRight;
    spacer.style.display = computed.display || "block";

    // 4) Perform actual removal by replacing node with spacer (drops event listeners too)
    parent.replaceChild(spacer, div);

    // 5) Verify removal
    const removed = !document.contains(div);
    return removed;
  } catch {
    return false;
  }
}