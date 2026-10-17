import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  GraduationCap,
  MessageSquare,
  LogOut,
  Layers,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useClassroomStore } from "@/store/useClassroomStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "Doubt AI", icon: MessageSquare },
] as const;

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const { classrooms, selectedClassroomId, setSelectedClassroomId } = useClassroomStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const isTeacher = user.role === "teacher";

  const handleLogout = () => {
    logout();
    toast.success("Signed out", { description: "Your session has ended." });
    navigate("/login");
  };

  const handleClassChange = (value: string) => {
    setSelectedClassroomId(value);
    if (location.pathname.startsWith("/chat")) {
      navigate(`/chat/${value}`);
    }
  };

  const isLinkActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const classSelector = (
    <label className="flex items-center gap-2 pl-4 border-l border-border">
      <Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Select classroom</span>
      <select
        value={selectedClassroomId}
        onChange={(e) => handleClassChange(e.target.value)}
        className="bg-transparent text-small font-medium text-foreground focus:outline-none cursor-pointer max-w-52 truncate"
      >
        {classrooms.map((c) => (
          <option key={c.id} value={c.id} className="bg-card text-foreground">
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Mobile menu + Brand + Course Selector */}
        <div className="flex items-center gap-4 min-w-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader className="border-b border-border pb-4">
                <SheetTitle className="flex items-center gap-2 text-h3 font-display font-bold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <GraduationCap className="h-4 w-4" strokeWidth={2} />
                  </span>
                  SyllabusIQ
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile navigation">
                {navLinks.map((link) => {
                  const target =
                    link.to === "/chat" ? (selectedClassroomId ? `/chat/${selectedClassroomId}` : "/chat") : link.to;
                  const active = isLinkActive(link.to);
                  return (
                    <Link
                      key={link.label}
                      to={target}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-nav-item font-medium transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      }`}
                    >
                      <link.icon className="h-4 w-4" strokeWidth={1.75} />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="px-4 pt-2 border-t border-border mt-2 space-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-label font-medium text-foreground">Classroom</span>
                  <select
                    value={selectedClassroomId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-small text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Select classroom"
                  >
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 font-semibold text-foreground tracking-tight hover:opacity-90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
              <GraduationCap className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-h3 font-display font-bold leading-tight">SyllabusIQ</span>
              <span className="text-caption text-muted-foreground leading-none hidden sm:block">
                Academic Platform
              </span>
            </div>
          </Link>

          <div className="hidden md:flex">{classSelector}</div>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden sm:flex items-center gap-1" aria-label="Primary navigation">
          {navLinks.map((link) => {
            const target = link.to === "/chat" ? (selectedClassroomId ? `/chat/${selectedClassroomId}` : "/chat") : link.to;
            const active = isLinkActive(link.to);
            return (
              <Link
                key={link.label}
                to={target}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 text-nav-item font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <link.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="flex-col text-right hidden md:flex">
              <span className="text-small font-medium text-foreground leading-tight">
                {user.name}
              </span>
              <span className="text-caption text-muted-foreground leading-none font-mono tabular">
                {user.rollNo || user.department?.split(" ")[0] || "University"}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
