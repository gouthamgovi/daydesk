'use client';

import { useEffect, useState } from 'react';

let listeners: ((msg: string) => void)[] = [];

export function showToast(msg: string) {
  listeners.forEach((l) => l(msg));
}

export default function ToastHost() {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    const onShow = (text: string) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, text }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }, 2400);
    };
    listeners.push(onShow);
    return () => {
      listeners = listeners.filter((l) => l !== onShow);
    };
  }, []);

  return (
    <>
      {items.map((it) => (
        <div key={it.id} className="toast">
          {it.text}
        </div>
      ))}
    </>
  );
}
