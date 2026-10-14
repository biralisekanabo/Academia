import { Squelette } from "@/composants/ui/squelette";

export default function ChargementLocale() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <Squelette className="size-12 rounded-2xl" />
        <div className="space-y-2">
          <Squelette className="h-6 w-48" />
          <Squelette className="h-4 w-64" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Squelette key={index} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Squelette key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
