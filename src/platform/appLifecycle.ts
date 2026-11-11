/** Android appStateChange и web visibility скрывают личную информацию до возврата. */
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
export function watchLifecycle(lock: () => void) {
  const web = () => {
    if (document.hidden) lock();
  };
  document.addEventListener('visibilitychange', web);
  const native = Capacitor.isNativePlatform()
    ? App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) lock();
      })
    : null;
  return () => {
    document.removeEventListener('visibilitychange', web);
    void native?.then((h) => h.remove());
  };
}
