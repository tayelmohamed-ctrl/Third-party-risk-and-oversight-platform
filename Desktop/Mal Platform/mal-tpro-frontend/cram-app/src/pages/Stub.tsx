export default function Stub({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-line rounded-2xl p-8 text-center text-muted text-[13px] leading-relaxed">
      <div className="font-display text-ink text-lg mb-2">{title}</div>
      {body}
      <div className="mt-3 text-faint text-xs">This module is scaffolded — wire it up next in Cursor (see docs/).</div>
    </div>
  );
}
