import VintageButton from "@/components/VintageButton";
import VintageCard from "@/components/VintageCard";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 bg-amber-100">
      <main className="max-w-2xl w-full flex flex-col items-center gap-8">
        <VintageCard
          title="Tarjeta Vintage"
          description="Una tarjeta con estilo retro, bordes marcados y textura sutil."
        >
          <p className="text-sm text-zinc-800">
            Este es un ejemplo de componente con estética vintage usando Tailwind. Puedes reutilizarlo
            en cualquier parte del proyecto.
          </p>
          <div className="mt-6">
            <VintageButton label="Acción" />
          </div>
        </VintageCard>
      </main>
    </div>
  );
}
