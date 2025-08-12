import { useMemo, useState, useEffect } from 'react';
import {
  UseProcessedKanbanDataProps,
  UseProcessedKanbanDataReturn,
  KanbanTask,
  ProcessedKanbanColumns,
  TasksMap,
  ProcessedColumnOrder,
} from '@/components/kanban/kanbanTypes';
import { applyTaskFilters, generateKanbanColumns } from '@/components/kanban/kanbanUtils';

const useProcessedKanbanData = ({
  rawTasks,
  viewMode,
  boardMode,
  filters,
  projectId,
}: UseProcessedKanbanDataProps): UseProcessedKanbanDataReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Efeito para simular carregamento/erro durante o processamento, se necessário.
  // Por enquanto, o processamento é síncrono após a filtragem.
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    try {
      // A lógica de processamento real está no useMemo abaixo.
      // Este useEffect é mais para controlar o estado de loading/error em torno do processamento.
      // Se o processamento se tornar assíncrono, esta lógica seria mais complexa.
      setIsLoading(false);
    } catch (e: any) {
      console.error("Erro ao processar dados do Kanban:", e);
      setError("Falha ao processar os dados das tarefas.");
      setIsLoading(false);
    }
  }, [rawTasks, viewMode, boardMode, filters, projectId]);


  const processedData = useMemo(() => {
    // console.log('[useProcessedKanbanData] Recalculando dados. Filters:', filters);
    // console.log('[useProcessedKanbanData] Raw tasks count:', rawTasks.length);

    const filteredTasks = applyTaskFilters(rawTasks, filters, boardMode);
    // console.log('[useProcessedKanbanData] Filtered tasks count:', filteredTasks.length);

    const {
      columns,
      tasksMap,
      columnOrder,
    } = generateKanbanColumns(filteredTasks, viewMode /*, boardMode, projectId */);
    // console.log('[useProcessedKanbanData] Generated columns:', columns);

    return { columns, tasksMap, columnOrder };
  }, [rawTasks, viewMode, boardMode, filters /*, projectId */]); // projectId pode não ser necessário como dep se já filtrado

  return {
    ...processedData,
    isLoading,
    error,
  };
};

export default useProcessedKanbanData;
