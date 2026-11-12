/** Единая системная «Назад»: Capacitor и история браузера. */
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
let armed = false;
export function watchBackButton(back: () => void) {
  // Одна защитная запись удерживает Back внутри приложения; экранные маршруты replace.
  // После popstate восстанавливаем её, поэтому количество записей не растёт с экранами.
  if (!armed) {
    history.pushState(history.state, '', location.href);
    armed = true;
  }
  const browserBack = () => {
    history.pushState(history.state, '', location.href);
    back();
  };
  window.addEventListener('popstate', browserBack);
  const native = Capacitor.isNativePlatform()
    ? App.addListener('backButton', back)
    : null;
  return () => {
    window.removeEventListener('popstate', browserBack);
    void native?.then((handle) => handle.remove());
  };
}
export function exitApp() {
  if (Capacitor.isNativePlatform()) void App.exitApp();
}
