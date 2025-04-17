import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';

const TestPage = () => {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Página de Teste</h1>
            <p className="text-muted-foreground">
              Esta é uma página de teste para verificar se o roteamento está funcionando.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TestPage;
