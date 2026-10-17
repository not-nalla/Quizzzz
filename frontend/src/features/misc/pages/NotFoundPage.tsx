import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, ArrowLeft, Home } from "lucide-react";

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
          <Compass className="h-6 w-6" strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-caption text-muted-foreground">
            Error 404
          </p>
          <h1 className="text-h1 font-display font-bold text-headings">
            Page Not Found
          </h1>
          <p className="text-body text-muted-foreground leading-relaxed max-w-sm mx-auto">
            The requested route does not exist in this workspace. Return to your
            classroom dashboard to continue.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-button h-9 gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Go Back
          </Button>
          <Link to="/dashboard">
            <Button size="sm" className="text-button h-9 gap-1.5">
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
