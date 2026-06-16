export default async function ValidationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Validation Detail</h1>
        <p className="text-muted-foreground">Detailed validation result with consensus data.</p>
        <p className="mt-2 text-sm text-muted-foreground">ID: {id}</p>
      </div>
    </div>
  );
}
