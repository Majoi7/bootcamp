import { createFileRoute } from "@tanstack/react-router";
import AvisForm from "@/components/AvisForm";
export const Route = createFileRoute("/avis")({
  component: AvisPage,
});

function AvisPage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4 flex items-center justify-center">
      <AvisForm />
    </div>
  );
}