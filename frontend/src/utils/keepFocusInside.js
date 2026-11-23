// Elements of a window that the Tab key can reach
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Keeps the Tab key inside "container": from the last element it goes to the first and the other way round.
export function keepFocusInside(container, event) {
  const elements = [...container.querySelectorAll(FOCUSABLE)];
  if (elements.length === 0) return;
  const first = elements[0];
  const last = elements.at(-1);
  const outside = !container.contains(document.activeElement);

  if (event.shiftKey && (outside || document.activeElement === first)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (outside || document.activeElement === last)) {
    event.preventDefault();
    first.focus();
  }
}
