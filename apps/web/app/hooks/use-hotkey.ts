import { useEffect, useRef } from 'react';

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export function modKeyLabel(): string {
  return isApplePlatform() ? '⌘' : 'Ctrl';
}

type UseHotkeyOptions = {
  key: string;
  /** Require ⌘ (macOS) or Ctrl (other platforms). */
  mod?: boolean;
  enabled?: boolean;
  /**
   * Skip when focus is in an editable field.
   * Defaults to true for non-mod shortcuts; false for mod shortcuts (global).
   */
  ignoreWhenEditable?: boolean;
  preventDefault?: boolean;
  onKeyDown: (event: KeyboardEvent) => void;
};

/**
 * Window-level keyboard shortcut. Letter keys compare case-insensitively so
 * Caps Lock does not break the combo.
 */
export function useHotkey({
  key,
  mod = false,
  enabled = true,
  ignoreWhenEditable,
  preventDefault = true,
  onKeyDown,
}: UseHotkeyOptions): void {
  const skipEditable = ignoreWhenEditable ?? !mod;
  const onKeyDownRef = useRef(onKeyDown);
  onKeyDownRef.current = onKeyDown;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const normalizedKey = key.length === 1 ? key.toLowerCase() : key;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (eventKey !== normalizedKey) {
        return;
      }

      const hasMod = event.metaKey || event.ctrlKey;
      if (mod ? !hasMod : hasMod || event.altKey) {
        return;
      }

      if (skipEditable && isEditableKeyboardTarget(event.target)) {
        return;
      }

      if (preventDefault) {
        event.preventDefault();
      }

      onKeyDownRef.current(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, key, mod, preventDefault, skipEditable]);
}
