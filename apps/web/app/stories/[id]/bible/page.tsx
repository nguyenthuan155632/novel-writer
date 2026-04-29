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
      <div>
        <h1>Bible</h1>
        <p>Chưa có bible. Click bên dưới để generate (sẽ gọi LLM thật và tốn token).</p>
        <GenerateButton storyId={id} />
      </div>
    );
  }

  return (
    <div>
      <h1>Bible <span className="muted">v{bible.version}</span></h1>
      <a href={`/stories/${id}/bible/few-shots`} className="text-blue-600 underline text-sm">Edit style few-shots →</a>
      <details style={{ marginBottom: 16 }}>
        <summary>Re-generate (sẽ tạo bible mới — version cũ vẫn được giữ)</summary>
        <div style={{ marginTop: 8 }}><GenerateButton storyId={id} /></div>
      </details>
      <EditForm storyId={id} bible={bible} />
    </div>
  );
}