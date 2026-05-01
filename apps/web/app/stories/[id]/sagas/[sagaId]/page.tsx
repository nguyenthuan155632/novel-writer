import Link from "next/link";
import { listArcs } from "@/lib/api/arcs";
import { getSaga } from "@/lib/api/sagas";
import { PlanArcsButton } from "./PlanArcsButton";

export default async function SagaDetail({
  params,
}: {
  params: Promise<{ id: string; sagaId: string }>;
}) {
  const { id, sagaId } = await params;
  let saga: Awaited<ReturnType<typeof getSaga>> | null = null;
  let arcs: Awaited<ReturnType<typeof listArcs>> = [];
  let error: string | null = null;
  try {
    [saga, arcs] = await Promise.all([
      getSaga(id, sagaId),
      listArcs(id, sagaId),
    ]);
  } catch (e) {
    error = (e as Error).message;
  }
  if (!saga) {
    return (
      <>
        <header className="studio-header">
          <div>
            <p className="studio-kicker">Saga</p>
            <h1>Saga</h1>
          </div>
        </header>
        {error && <p className="error">Failed to load saga: {error}</p>}
      </>
    );
  }
  const defaultCurrentState = [
    `Saga: ${saga.title}`,
    saga.premise ? `Premise: ${saga.premise}` : "",
    `Chapter range: ${saga.startChapter ?? "?"}-${saga.endChapter ?? "?"}`,
    saga.rollingSummary
      ? `Rolling summary: ${saga.rollingSummary}`
      : "No chapters have been generated yet.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Saga</p>
          <h1>{saga.title}</h1>
          <p className="meta-line">
            Chapters {saga.startChapter}–{saga.endChapter} · summary v
            {saga.summaryVersion}
          </p>
        </div>
      </header>
      <section className="studio-panel">
        <h2 style={{ marginTop: 0 }}>Premise</h2>
        <p>{saga.premise}</p>
        <h2>Turning points</h2>
        <ol>
          {saga.expectedTurningPoints.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
        <h2>Rolling summary</h2>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {saga.rollingSummary ?? "(not yet generated)"}
        </pre>
      </section>
      <section className="studio-panel">
        <h2 style={{ marginTop: 0 }}>Arcs</h2>
        {arcs.length === 0 ? (
          <p className="muted">
            No arcs planned yet. Plan arcs before generating chapters in this
            saga.
          </p>
        ) : (
          <ul className="list-clean">
            {arcs.map((arc) => (
              <li key={arc.id} className="studio-card">
                <div className="studio-card-title">
                  <Link href={`/stories/${id}/arcs/${arc.id}` as any}>
                    {(arc.arcNumber ?? 0) + 1}. {arc.title}
                  </Link>
                  <span className="muted">
                    Chapters {arc.startChapter}–{arc.endChapter}
                  </span>
                </div>
                <p className="muted">{arc.premise}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <PlanArcsButton
        storyId={id}
        sagaId={sagaId}
        defaultCurrentState={defaultCurrentState}
      />
    </>
  );
}
