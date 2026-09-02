/** Placeholder for a §6.2 screen not yet built — Phase 0 only wires routing and roles. */
export function StubPage({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">Экран появится в {phase}.</p>
    </div>
  );
}
