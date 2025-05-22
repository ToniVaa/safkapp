// src/components/Toast.js
import React, { useEffect, useState } from 'react';

const Toast = ({ message, type, duration = 3000, onDismiss }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  const toastClass = `toast-notification ${type}`;

  return (
    <div className={toastClass} role="alert" aria-live="assertive">
      {message}
    </div>
  );
};

export default Toast;