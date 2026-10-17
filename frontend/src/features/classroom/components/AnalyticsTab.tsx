import React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { BarChart3, Users, Award, TrendingUp, Download, CheckCircle2, BarChart2 } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { ClassAnalytics, Difficulty } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";

interface Props {
  analytics?: ClassAnalytics;
}

export const AnalyticsTab: React.FC<Props> = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="text-center py-12 text-small text-muted-foreground border border-dashed border-border rounded-lg">
        No quiz performance data available for this classroom yet.
      </div>
    );
  }

  const difficultyVariant = (diff: Difficulty) => {
    switch (diff) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Student Name,Roll No,Quiz Title,Score,Total,Percentage,Submitted At"]
        .concat(
          analytics.recentResults.map(
            (r) =>
              `"${r.studentName}","${r.rollNo || ""}","${r.quizTitle}",${r.score},${r.total},${r.percentage}%,"${r.submittedAt}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Gradebook_${analytics.classroomId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Gradebook exported", {
      description: "The CSV download has started.",
    });
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top 4 KPI Metrics with AnimatedCounter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={staggerItem} className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-caption font-medium">Class Average</span>
            <Award className="h-4 w-4 text-primary" strokeWidth={1.75} />
          </div>
          <div className="text-stat font-display font-bold text-headings tabular">
            <AnimatedCounter value={analytics.averageScore} suffix="%" />
          </div>
          <span className="text-caption text-muted-foreground font-mono tabular mt-1 block">
            Across {analytics.totalAttempts} submissions
          </span>
        </motion.div>

        <motion.div variants={staggerItem} className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-caption font-medium">Participation</span>
            <TrendingUp className="h-4 w-4 text-success" strokeWidth={1.75} />
          </div>
          <div className="text-stat font-display font-bold text-headings tabular">
            <AnimatedCounter value={analytics.participationRate} suffix="%" />
          </div>
          <span className="text-caption text-muted-foreground font-mono tabular mt-1 block">
            {analytics.totalStudents} enrolled students
          </span>
        </motion.div>

        <motion.div variants={staggerItem} className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-caption font-medium">Quizzes Evaluated</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" strokeWidth={1.75} />
          </div>
          <div className="text-stat font-display font-bold text-headings tabular">
            <AnimatedCounter value={analytics.quizzesPublished} />
          </div>
          <span className="text-caption text-muted-foreground font-mono tabular mt-1 block">
            Active syllabus assessments
          </span>
        </motion.div>

        <motion.div variants={staggerItem} className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-caption font-medium">Course Documents</span>
            <BarChart3 className="h-4 w-4 text-warning" strokeWidth={1.75} />
          </div>
          <div className="text-stat font-display font-bold text-headings tabular">
            <AnimatedCounter value={analytics.documentsReady} />
          </div>
          <span className="text-caption text-muted-foreground font-mono tabular mt-1 block">
            Notes & slides uploaded
          </span>
        </motion.div>
      </div>

      {/* Score distribution & Question accuracy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <motion.div variants={staggerItem} className="p-5 rounded-lg border border-border bg-card space-y-4">
          <h4 className="text-h4 font-semibold text-headings">
            Cohort Score Distribution
          </h4>
          <div className="space-y-3">
            {analytics.distribution.map((d) => (
              <div key={d.label} className="space-y-1">
                <div className="flex justify-between text-caption font-medium">
                  <span className="text-muted-foreground font-mono tabular">{d.label}</span>
                  <span className="font-mono tabular text-foreground">{d.count} students</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(d.count / analytics.totalStudents) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Question Accuracy breakdown */}
        <motion.div variants={staggerItem} className="p-5 rounded-lg border border-border bg-card space-y-4">
          <h4 className="text-h4 font-semibold text-headings">
            Question Difficulty & Accuracy
          </h4>
          <div className="space-y-3.5">
            {analytics.questionAccuracy.map((q) => (
              <div key={q.qId} className="p-3 rounded-md bg-secondary/30 border border-border/70 space-y-2">
                <div className="flex items-center justify-between text-small">
                  <span className="font-medium text-foreground truncate max-w-72">
                    {q.question}
                  </span>
                  <Badge variant={difficultyVariant(q.difficulty)} className="text-caption">
                    {q.difficulty}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-caption font-mono tabular text-muted-foreground">
                  <span>Accuracy: <strong className="text-foreground">{q.correctRate}%</strong></span>
                  <span>{q.attempts} attempts</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Gradebook table */}
      <motion.div variants={staggerItem} className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-border bg-muted/20">
          <div>
            <h4 className="text-h4 font-semibold text-headings">
              Recent Submissions Gradebook
            </h4>
            <p className="text-small text-muted-foreground">
              Server-authoritative evaluation log with student roll numbers
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex items-center gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          {analytics.recentResults.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No assessment data yet"
              description="Student results and analytics will appear here once quizzes are published and attempts are submitted."
            />
          ) : (
            <table className="w-full text-left">
            <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="p-3 pl-4 text-th">Student</th>
                <th className="p-3 text-th">Roll No</th>
                <th className="p-3 text-th">Assessment</th>
                <th className="p-3 text-th">Score</th>
                <th className="p-3 text-th">Percentage</th>
                <th className="p-3 pr-4 text-th">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analytics.recentResults.map((r, idx) => (
                <tr key={idx} className="hover:bg-accent/40 transition-colors">
                  <td className="p-3 pl-4 text-td font-medium text-foreground">{r.studentName}</td>
                  <td className="p-3 text-td font-mono tabular text-muted-foreground">{r.rollNo || "—"}</td>
                  <td className="p-3 text-td text-muted-foreground">{r.quizTitle}</td>
                  <td className="p-3 text-td font-mono tabular font-medium text-foreground">
                    {r.score} / {r.total}
                  </td>
                  <td className="p-3 text-td font-mono tabular">
                    <span className="px-2 py-0.5 rounded-full text-caption font-semibold bg-success/10 text-success border border-success/20">
                      {r.percentage}%
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-td font-mono tabular text-muted-foreground">
                    {new Date(r.submittedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      )}
        </div>
      </motion.div>
    </motion.div>
  );
};
