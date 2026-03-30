import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
        <h1 className="text-5xl font-bold text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">Página não encontrada</p>
        <Button asChild className="gradient-blue text-primary-foreground font-semibold">
          <a href="/">Voltar ao início</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
