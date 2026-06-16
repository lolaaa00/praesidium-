export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Policy Detail</h1>
        <p className="text-muted-foreground">View policy details and configuration.</p>
        <p className="mt-2 text-sm text-muted-foreground">ID: {id}</p>
      </div>
    </div>
  );
}
