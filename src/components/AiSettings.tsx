import { watchLifecycle } from '../platform/appLifecycle';
import { useEffect, useState } from 'react';
import { useSettings } from '../store/settingsStore';
import { ru } from '../i18n/ru';
import { isWebKeyStorage } from '../platform/secureStorage';
import { pasteFromClipboard } from '../platform/clipboard';
import { MODELS } from '../ai/config';
import { cancelAi } from '../ai/coordinator';
const t = ru.ai;
export function AiSettings() {
  const s = useSettings(),
    [key, setKey] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => watchLifecycle(() => setKey('')), []);
  return (
    <section>
      <h3>{t.title}</h3>
      {isWebKeyStorage() && <p role="note">{t.webWarning}</p>}
      <p>{t.keyPrivacy}</p>
      <p>{s.hasKey ? t.keySaved : t.noKey}</p>
      <label>
        {t.keyLabel}
        <input
          type="password"
          value={key}
          maxLength={512}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setKey(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={s.busy}
        onClick={() => {
          void pasteFromClipboard()
            .then(setKey)
            .catch(() => setNotice(t.clipboardError));
        }}
      >
        {t.paste}
      </button>
      <button
        type="button"
        disabled={s.busy || !key.trim()}
        onClick={() => {
          void s.verify(key).then((ok) => {
            setKey('');
            setNotice(ok ? t.keyOk : '');
          });
        }}
      >
        {t.verify}
      </button>
      <button
        type="button"
        disabled={s.busy || !s.hasKey}
        onClick={() => {
          cancelAi();
          setKey('');
          setNotice('');
          void s.remove();
        }}
      >
        {t.remove}
      </button>
      {s.busy && <p role="status">{t.checking}</p>}
      {notice && <p role="status">{notice}</p>}
      {s.error && <p role="alert">{s.error}</p>}
      <p>
        {t.balance}:{' '}
        {s.balance === null ? t.unknown : s.balance.toFixed(2) + ' ₽'}
      </p>
      <button
        type="button"
        disabled={s.busy || !s.hasKey}
        onClick={() => {
          void s.refresh();
        }}
      >
        {t.refresh}
      </button>
      <details>
        <summary>{t.advanced}</summary>
        <label>
          {t.model}
          <select
            value={s.model}
            onChange={(e) => {
              const model = MODELS.find((m) => m.id === e.target.value);
              if (model) void s.configure(model.id, s.fallback);
            }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.fallback}
            onChange={(e) => {
              void s.configure(s.model, e.target.checked);
            }}
          />
          {t.fallback}
        </label>
        <p>{t.modelUnverified}</p>
      </details>
      <details>
        <summary>{t.whereKey}</summary>
        <p>{t.keyHelp}</p>
        <a
          href="https://aitunnel.ru/panel/keys"
          target="_blank"
          rel="noreferrer"
        >
          {t.openAitunnel}
        </a>
      </details>
    </section>
  );
}
