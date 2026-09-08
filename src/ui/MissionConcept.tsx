import { missionApproaches } from "../course/missions/approaches";
import { useState } from "react";
import { missionTeaching } from "../course/missions/teaching";
import { predictions } from "../course/missions/predictions";
import type { MissionId } from "../course/missions/types";

export default function MissionConcept({
  id,
  lang,
}: {
  id: MissionId;
  lang: "en" | "zh";
}) {
  const note = missionTeaching[id],
    question = predictions[id];
  const [answer, setAnswer] = useState<number>();
  if (!note) return null;
  const i = lang === "zh" ? 1 : 0;
  return (
    <div className="mission-concept">
      <p>{note.concept[i]}</p>
      {missionApproaches[id] && <p className="mission-approach">{missionApproaches[id]![i]}</p>}
      <details>
        <summary>
          {question
            ? i
              ? "看例子，试着推想"
              : "Example & prediction"
            : i
              ? "例子"
              : "Worked example"}
        </summary>
        <p>{note.example[i]}</p>
        {question && (
          <fieldset className="concept-prediction">
            <legend>{question.question[i]}</legend>
            <div>
              {question.choices.map((choice, n) => (
                <button
                  type="button"
                  key={n}
                  aria-pressed={answer === n}
                  onClick={() => setAnswer(n)}
                >
                  {choice[i]}
                </button>
              ))}
            </div>
            {answer !== undefined && (
              <p role="status">
                <strong>
                  {answer === question.answer
                    ? i
                      ? "推想正确。"
                      : "That’s right. "
                    : i
                      ? "再想一想。"
                      : "Reconsider: "}
                </strong>
                {question.explanation[i]}
              </p>
            )}
          </fieldset>
        )}
      </details>
    </div>
  );
}
