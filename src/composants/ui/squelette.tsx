import { cn } from "@/utilitaires/cn";

function Squelette({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="squelette"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Squelette };