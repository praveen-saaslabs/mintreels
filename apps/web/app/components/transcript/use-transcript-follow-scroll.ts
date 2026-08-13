import { useEffect, useRef } from 'react';

const USER_SCROLL_PAUSE_MS = 4000;

function scrollTargetIntoView(list: HTMLElement, target: HTMLElement) {
  const listRect = list.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const outOfView = targetRect.top < listRect.top || targetRect.bottom > listRect.bottom;
  if (!outOfView) {
    return;
  }

  const offset =
    list.scrollTop + (targetRect.top - listRect.top) - list.clientHeight / 2 + targetRect.height / 2;

  list.scrollTo({ top: Math.max(0, offset), behavior: 'auto' });
}

export function useTranscriptFollowScroll(followKey: string | null, seekEpoch: number) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);
  const ignoreFollowUntilRef = useRef(0);
  const lastSeekEpochRef = useRef(seekEpoch);

  useEffect(() => {
    if (seekEpoch !== lastSeekEpochRef.current) {
      lastSeekEpochRef.current = seekEpoch;
      ignoreFollowUntilRef.current = 0;
    }

    if (followKey == null) {
      return;
    }

    if (Date.now() < ignoreFollowUntilRef.current) {
      return;
    }

    const list = listRef.current;
    const target = activeWordRef.current ?? activeItemRef.current;
    if (!list || !target) {
      return;
    }

    scrollTargetIntoView(list, target);
  }, [followKey, seekEpoch]);

  function pauseFollow() {
    ignoreFollowUntilRef.current = Date.now() + USER_SCROLL_PAUSE_MS;
  }

  return { listRef, activeWordRef, activeItemRef, pauseFollow };
}
