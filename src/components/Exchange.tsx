/**
 * Реплика диалога (ADR-037): вопрос игрока и ответ персонажа различаются цветом,
 * стороной экрана и подписью говорящего. Один компонент на всё приложение, поэтому
 * правило действует для всех дел — нынешних и будущих — без правок в данных дела.
 */
export function Exchange({
  asker,
  question,
  speaker,
  answer,
}: {
  asker: string;
  question: string;
  speaker: string;
  answer: string;
}) {
  return (
    <article className="exchange">
      {question && (
        <div className="say say-player">
          <small className="speaker">{asker}</small>
          <p>{question}</p>
        </div>
      )}
      <div className="say say-npc">
        <small className="speaker">{speaker}</small>
        <blockquote>{answer}</blockquote>
      </div>
    </article>
  );
}
