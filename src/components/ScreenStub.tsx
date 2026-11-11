import { Link } from 'react-router-dom';
import { ru } from '../i18n/ru';
import { screens, type ScreenId } from '../screens/catalog';

export default function ScreenStub({ id }: { id: ScreenId }) {
  const index = screens.findIndex((screen) => screen.id === id);
  const next = screens[(index + 1) % screens.length];
  if (!next) throw new Error('Screen catalog is empty');
  return (
    <main>
      <h2>{ru.screens[id].title}</h2>
      <p>{ru.screens[id].description}</p>
      <p>{ru.stubNotice}</p>
      <Link to={next.path}>{ru.nextScreen}</Link>
    </main>
  );
}
