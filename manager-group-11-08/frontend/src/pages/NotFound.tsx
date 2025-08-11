
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileWarning } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-3 rounded-full">
            <FileWarning className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-foreground mb-2">Página não encontrada</p>
        <p className="text-muted-foreground mb-6">
          A página que você está procurando não existe ou foi movida para outro endereço.
        </p>
        <Button asChild>
          <a href="/">Voltar para o Dashboard</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
