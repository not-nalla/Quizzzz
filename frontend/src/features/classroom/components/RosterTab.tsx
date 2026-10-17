import React, { useEffect, useState } from "react";
import { Users, Search, UserMinus, ShieldCheck, Mail, UserPlus, Loader2 } from "lucide-react";
import { ClassroomMember } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { classroomApi } from "@/api/client";
import { toast } from "sonner";

interface Props {
  members: ClassroomMember[];
  isTeacher: boolean;
  classroomId: string;
}

export const RosterTab: React.FC<Props> = ({ members, isTeacher, classroomId }) => {
  const [search, setSearch] = useState("");
  const [roster, setRoster] = useState(members);
  const [evictingId, setEvictingId] = useState<string | null>(null);

  useEffect(() => {
    setRoster(members);
  }, [members]);

  const handleEvict = async (userId: string) => {
    if (evictingId) return;
    setEvictingId(userId);
    try {
      await classroomApi.evictMember(classroomId, userId);
      setRoster((prev) => prev.filter((m) => m.userId !== userId));
      toast.success("Student removed from classroom.");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to remove student.";
      toast.error("Error", { description: msg });
    } finally {
      setEvictingId(null);
    }
  };

  const filtered = roster.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.rollNo && m.rollNo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-h3 font-semibold text-headings">Enrolled Roster</h3>
          <p className="text-small text-muted-foreground">
            {roster.length} registered students enrolled in this classroom cohort.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-input h-9"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No students enrolled"
              description="Students will appear here once they join using the classroom code."
            />
          ) : (
            <table className="w-full text-left">
              <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="p-3 pl-4 text-th">Student</th>
                  <th className="p-3 text-th">Roll Number</th>
                  <th className="p-3 text-th">Institutional Email</th>
                  <th className="p-3 text-th">Department</th>
                  <th className="p-3 text-th">Enrolled At</th>
                  {isTeacher && <th className="p-3 pr-4 text-right text-th">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((m) => (
                  <tr key={m.userId} className="hover:bg-accent/40 transition-colors">
                    <td className="p-3 pl-4 text-td">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-caption flex items-center justify-center font-mono">
                          {m.name.charAt(0)}
                        </div>
                        <span className="text-body font-medium text-foreground">{m.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-td font-mono tabular text-muted-foreground">{m.rollNo || "—"}</td>
                    <td className="p-3 text-td text-muted-foreground font-mono">{m.email}</td>
                    <td className="p-3 text-td text-muted-foreground">{m.department || "Engineering"}</td>
                    <td className="p-3 text-td font-mono tabular text-muted-foreground">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    {isTeacher && (
                      <td className="p-3 pr-4 text-right text-td">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEvict(m.userId)}
                          disabled={evictingId === m.userId}
                          className="h-7 px-2 text-destructive hover:bg-destructive/10"
                        >
                          {evictingId === m.userId ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <UserMinus className="h-3 w-3 mr-1" />
                          )}
                          Evict
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
