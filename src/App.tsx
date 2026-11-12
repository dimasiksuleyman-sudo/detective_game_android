import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { screens } from './screens/catalog';
import { ru } from './i18n/ru';
import styles from './App.module.css';

const pages = screens.map((screen) => ({
  ...screen,
  Component: lazy(() => import(`./screens/${screen.id}/index.tsx`)),
}));

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <p>{ru.city}</p>
        <h1>{ru.appName}</h1>
        <p>{ru.stage}</p>
      </header>
      <Suspense fallback={<p role="status">{ru.loading}</p>}>
        <Routes>
          {pages.map(({ id, path, Component }) => (
            <Route key={id} path={path} element={<Component />} />
          ))}
          <Route path="*" element={<Navigate to="/s01" replace />} />
        </Routes>
      </Suspense>
      <nav aria-label={ru.navigation} className={styles.navigation}>
        {screens.map(({ id, path }) => (
          <NavLink key={id} to={path}>
            {ru.screens[id].title}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
