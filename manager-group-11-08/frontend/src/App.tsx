
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import './styles/tiptap.css'; // Importa os estilos do TipTap
import 'prosemirror-view/style/prosemirror.css'; // Importa os estilos base do ProseMirror
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import AppRoutes from "@/routes";

const App = () => {
  return (
    <React.StrictMode>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </React.StrictMode>
  );
};

export default App;
