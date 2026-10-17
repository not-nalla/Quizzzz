import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<Props> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => (
  <div
    className={cn(
      "text-center py-12 px-6 border border-dashed border-border rounded-lg bg-card/50 space-y-3",
      className
    )}
  >
    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </div>
    <div className="space-y-1">
      <p className="text-h3 font-display font-semibold text-headings">{title}</p>
      <p className="text-small text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
    </div>
    {actionLabel && onAction && (
      <Button size="sm" variant="outline" className="text-small h-8" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
