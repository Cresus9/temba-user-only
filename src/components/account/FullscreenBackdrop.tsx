import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/** Covers the viewport, including the navbar, by portalling out of page transitions. */
export default function FullscreenBackdrop({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose?: () => void;
}) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[rgba(3,6,30,0.55)] p-4"
      onClick={onClose}
      role="presentation"
    >
      {children}
    </div>,
    document.body,
  );
}
