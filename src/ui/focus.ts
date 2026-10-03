export function dialogControls(dialog: HTMLElement) {
  return [
    ...dialog.querySelectorAll<HTMLElement>(
      'button,input,select,textarea,summary,a[href],[tabindex]:not([tabindex="-1"])',
    ),
  ].filter((node) => {
    for (
      let parent = node.parentElement;
      parent && parent !== dialog;
      parent = parent.parentElement
    )
      if (
        parent instanceof HTMLDetailsElement &&
        !parent.open &&
        !parent.querySelector(":scope > summary")?.contains(node)
      )
        return false;
    const rect = node.getBoundingClientRect();
    return (
      !node.matches(":disabled") &&
      !node.closest("[inert]") &&
      rect.width > 0 &&
      rect.height > 0 &&
      getComputedStyle(node).visibility !== "hidden"
    );
  });
}
