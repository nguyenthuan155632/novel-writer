import { apiFetch } from '@/lib/api-client';
import { GenerateButton } from './generate-button';
import { EditForm } from './edit-form';

interface Bible {
  id: string;
  storyId: string;
  version: number;
  worldRules: string;
  cultivationSystem: string;
  bloodlineSystem: string;
  styleGuide: string;
  forbiddenRules: string;
  endingDirection: string | null;
  compactSummary: string | null;
}

export default async function BiblePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let bible: Bible | null = null;
  try { bible = await apiFetch<Bible>(`/api/stories/${id}/bible`); } catch {}

  if (!bible) {
    return (
      <>
        <header className="studio-header">
          <div>
            <p className="studio-kicker">Story bible</p>
            <h1>Bible</h1>
            <p className="studio-subtitle">Chưa có bible. Click bên dưới để generate.</p>
          </div>
          <GenerateButton storyId={id} />
        </header>
      </>
    );
  }

  return (
    <>
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Story bible</p>
          <h1>Bible <span className="muted">v{bible.version}</span></h1>
          <p className="studio-subtitle">Maintain the world, systems, voice, and compact context used by chapter generation.</p>
        </div>
        <a href={`/stories/${id}/bible/few-shots`}>Edit style few-shots</a>
      </header>
      <details className="studio-panel">
        <summary>Re-generate (sẽ tạo bible mới — version cũ vẫn được giữ)</summary>
        <div style={{ marginTop: 8 }}><GenerateButton storyId={id} /></div>
      </details>
      <EditForm storyId={id} bible={bible} />
    </>
  );
}
