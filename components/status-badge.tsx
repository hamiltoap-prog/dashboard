import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<ProjectStatus, string> = {
  planejamento: "bg-muted-foreground",
  em_producao: "bg-primary",
  ensaios: "bg-warning",
  em_cartaz: "bg-success",
  concluido: "bg-muted-foreground",
  pausado: "bg-destructive",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5 font-medium", className)}>
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {PROJECT_STATUS_LABEL[status]}
    </Badge>
  );
}
