type PointerDownLike = {
  button: number;
};

/**
 * Suppresses browser text selection while a pointer drag is in progress
 * (scrubbers, waveform, pane splitters). Restores prior body styles on end.
 */
export function beginDragSelectSuppression(): () => void {
  window.getSelection()?.removeAllRanges();

  const body = document.body;
  const previousUserSelect = body.style.getPropertyValue('user-select');
  const previousWebkitUserSelect = body.style.getPropertyValue('-webkit-user-select');

  body.style.setProperty('user-select', 'none');
  body.style.setProperty('-webkit-user-select', 'none');

  let cleaned = false;
  const end = () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    if (previousUserSelect) {
      body.style.setProperty('user-select', previousUserSelect);
    } else {
      body.style.removeProperty('user-select');
    }
    if (previousWebkitUserSelect) {
      body.style.setProperty('-webkit-user-select', previousWebkitUserSelect);
    } else {
      body.style.removeProperty('-webkit-user-select');
    }
    window.removeEventListener('pointerup', end, true);
    window.removeEventListener('pointercancel', end, true);
    window.removeEventListener('blur', end);
  };

  window.addEventListener('pointerup', end, true);
  window.addEventListener('pointercancel', end, true);
  window.addEventListener('blur', end);

  return end;
}

/**
 * Clears selection and disables body text selection for the drag gesture.
 * Does not call preventDefault — safe for WaveSurfer / third-party handlers.
 */
export function suppressSelectionOnPointerDown(event: PointerDownLike): void {
  if (event.button !== 0) {
    return;
  }
  beginDragSelectSuppression();
}
