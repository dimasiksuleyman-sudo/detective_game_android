import type { CaseFile } from '../content/schema';
import { ru } from '../i18n/ru';
type Document = NonNullable<CaseFile['clues'][number]['document']>;
export function DocumentRender({
  document,
  title,
}: {
  document: Document;
  title?: string;
}) {
  return (
    <section
      className={'document document-' + document.template}
      aria-label={ru.qa.document}
      data-template={document.template}
    >
      {Object.entries(document.fields).map(([key, value]) => (
        <div key={key} className="documentField">
          {(Array.isArray(value) ? value : [value])
            .filter((line) => line !== title)
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
      ))}
    </section>
  );
}
