import VistaSala from "@/components/vista-sala";

type Props = {
  params: Promise<{ eventoId: string }> | { eventoId: string };
};

export default async function Page({ params }: Props) {
  const { eventoId } = await params;
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Vista administrativa — Sala</h2>
      <p className="text-sm text-gray-600 mb-4">Evento: {eventoId}</p>
      {/* Client component that will fetch the grid */}
      {/* @ts-expect-error Server -> Client param pass */}
      <VistaSala eventoId={eventoId} />
    </div>
  );
}
