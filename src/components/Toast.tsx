import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3800);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast ${type}`} role="alert">
      <span style={{ fontSize: 16, flexShrink: 0 }}>{ICONS[type]}</span>
      {message}
    </div>
  );
}
