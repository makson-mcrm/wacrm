'use client';

import { useEffect, useMemo, type AnchorHTMLAttributes } from 'react';

/** Delay the existing single-click action so a double click cannot replace the board. */
export function createRecordLinkHandlers(href: string, onOpen: () => void) {
  let pending: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => { clearTimeout(pending); pending = undefined; };
  const openTab = () => { cancel(); window.open(href, '_blank', 'noopener'); };
  return {
    cancel,
    onClick(event: { preventDefault: () => void; stopPropagation: () => void; metaKey: boolean; ctrlKey: boolean; detail: number }) {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      if (event.metaKey || event.ctrlKey) openTab();
      else if (event.detail === 0) onOpen(); // keyboard activation
      else if (event.detail === 1) pending = setTimeout(onOpen, 500);
    },
    onDoubleClick(event: { preventDefault: () => void; stopPropagation: () => void }) {
      event.preventDefault();
      event.stopPropagation();
      openTab();
    },
  };
}

export function RecordCardLink({ href, onOpen, children, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick' | 'onDoubleClick'> & {
  href: string;
  onOpen: () => void;
}) {
  const handlers = useMemo(() => createRecordLinkHandlers(href, onOpen), [href, onOpen]);
  useEffect(() => handlers.cancel, [handlers]);
  return <a {...props} href={href} target="_blank" rel="noopener" onClick={handlers.onClick} onDoubleClick={handlers.onDoubleClick}>{children}</a>;
}
