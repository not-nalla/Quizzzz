import React from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { Bell, FileText, CheckCircle2, UserPlus, Clock } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityItem } from "@/types";

interface Props {
  activities: ActivityItem[];
}

export const ActivityFeed: React.FC<Props> = ({ activities }) => {
  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "quiz_published":
        return <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={1.75} />;
      case "document":
        return <FileText className="h-4 w-4 text-success" strokeWidth={1.75} />;
      case "joined":
        return <UserPlus className="h-4 w-4 text-primary" strokeWidth={1.75} />;
      default:
        return <Bell className="h-4 w-4 text-warning" strokeWidth={1.75} />;
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {activities.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No activity yet"
          description="Announcements, published quizzes, and new enrollments will appear here in reverse-chronological order."
        />
      ) : (
        activities.map((item) => (
          <motion.div
            key={item.id}
            variants={staggerItem}
            className="flex items-start gap-3.5 p-4 rounded-lg border border-border bg-card text-card-foreground transition-colors hover:border-border/80"
          >
            <div className="p-2 rounded-md bg-secondary/70 border border-border mt-0.5">
              {getIcon(item.type)}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-small font-semibold text-foreground">{item.title}</span>
                <span className="text-caption text-muted-foreground font-mono tabular flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {item.detail && (
                <p className="text-small text-muted-foreground leading-relaxed">{item.detail}</p>
              )}

              <div className="text-caption text-muted-foreground pt-0.5">
                Posted by <span className="text-foreground font-medium">{item.actor}</span>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
};
