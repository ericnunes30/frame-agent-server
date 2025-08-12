
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskTimerProps {
  taskId: string;
  onStatusChange: (status: string) => void;
  onTimerUpdate?: (seconds: number) => void; // Callback para atualizar o timer no backend
  initialTime?: number; // Tempo inicial do timer (do backend)
  compact?: boolean;
  isRunning?: boolean; // Estado externo do timer (para sincronização entre componentes)
  disabled?: boolean; // TEMPORARIAMENTE DESABILITADO - não é prioridade corrigir bugs
}

export const TaskTimer: React.FC<TaskTimerProps> = ({
  taskId,
  onStatusChange,
  onTimerUpdate,
  initialTime = 0,
  compact = true,
  isRunning: externalIsRunning,
  disabled = true // TEMPORARIAMENTE DESABILITADO POR PADRÃO - bugs não são prioridade
}) => {
  // Se o estado externo do timer for fornecido, usá-lo; caso contrário, usar o estado local
  const [isRunningInternal, setIsRunningInternal] = useState(false);
  // Garantir que externalIsRunning seja tratado como booleano
  const isRunning = externalIsRunning === true ? true : (externalIsRunning === false ? false : isRunningInternal);
  const setIsRunning = (value: boolean) => {
    if (externalIsRunning === undefined) {
      setIsRunningInternal(value);
    }
    // Se o estado externo for fornecido, não podemos alterá-lo diretamente
    // O componente pai deve lidar com isso através do callback onStatusChange
  };

  // Usar o initialTime diretamente como estado para garantir que as atualizações sejam refletidas
  const [time, setTime] = useState(initialTime);

  // Atualizar o estado time quando initialTime mudar, mas apenas se não estiver em execução
  // Usando useRef para controlar quando atualizar
  const shouldUpdateRef = useRef(true);

  useEffect(() => {
    // Evitar atualizações desnecessárias
    if (!shouldUpdateRef.current) {
      shouldUpdateRef.current = true;
      return;
    }

    // Se o timer não estiver em execução, atualizar o valor
    // Se estiver em execução, só atualizar se o valor inicial for maior que o valor atual
    if (!isRunning || initialTime > time) {
      if (initialTime !== time) {
        setTime(initialTime);
      }
    }

    // Atualizar a referência para o último valor inicial
    lastInitialTimeRef.current = initialTime;

    // Desativar atualizações para a próxima renderização
    shouldUpdateRef.current = false;
  }, [initialTime]);

  // Referência para armazenar o último valor inicial recebido
  const lastInitialTimeRef = useRef(initialTime);

  // Carregar o tempo e estado salvos do localStorage quando o componente é montado
  useEffect(() => {
    // Verificar se o timer foi pausado manualmente
    const manuallyPaused = localStorage.getItem(`task_timer_manually_paused_${taskId}`) === 'true';

    // Lógica para determinar o valor inicial do timer
    if (initialTime > 0) {
      // Se o timer estiver em execução, verificar se o valor inicial é maior que o valor atual
      // para evitar "voltar no tempo" quando o timer está rodando
      if (isRunning && initialTime < time) {
        // Manter valor atual
      } else if (!isRunning) {
        // Se o timer não estiver em execução, usar o valor inicial
        setTime(initialTime);
      }

      // Sempre atualizar a referência para o último valor
      lastInitialTimeRef.current = initialTime;
    } else if (initialTime === 0 && !isRunning) {
      // Se o valor inicial é 0 e o timer não está em execução, verificar se temos um valor salvo no localStorage
      const savedTime = localStorage.getItem(`task_timer_${taskId}`);
      if (savedTime) {
        const parsedTime = parseInt(savedTime, 10);
        setTime(parsedTime);
      }
    }

    // Salvar o estado atual no localStorage para recuperação futura
    localStorage.setItem(`task_timer_${taskId}`, time.toString());

    // Apenas carregar o estado de execução do localStorage se não tivermos um estado externo
    // e o timer não foi pausado manualmente
    if (externalIsRunning === undefined && !manuallyPaused) {
      const savedRunningState = localStorage.getItem(`task_timer_running_${taskId}`);
      if (savedRunningState === 'true') {
        setIsRunning(true);
      }
    }
  }, [taskId, initialTime, time, isRunning]); // Adicionadas dependências em time e isRunning para garantir sincronização correta

  // Salvar o tempo no localStorage quando ele muda (apenas se não estiver usando estado externo)
  // Usar uma referência para controlar a frequência de salvamento
  const lastSavedTimeRef = useRef(time);
  const saveTimerThrottleRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Evitar múltiplas chamadas usando throttling
    if (saveTimerThrottleRef.current) {
      clearTimeout(saveTimerThrottleRef.current);
    }

    // Apenas salvar no localStorage se não estiver usando estado externo
    // E apenas se o tempo mudou significativamente (a cada 10 segundos)
    if (externalIsRunning === undefined && Math.abs(time - lastSavedTimeRef.current) >= 10) {
      // Usar um timeout para evitar múltiplas chamadas em sequência
      saveTimerThrottleRef.current = setTimeout(() => {
        localStorage.setItem(`task_timer_${taskId}`, time.toString());
        lastSavedTimeRef.current = time;
        saveTimerThrottleRef.current = null;
      }, 1000);
    }

    // Limpar o timeout na desmontagem
    return () => {
      if (saveTimerThrottleRef.current) {
        clearTimeout(saveTimerThrottleRef.current);
        saveTimerThrottleRef.current = null;
      }
    };
  }, [time, taskId, externalIsRunning]);

  // Salvar o estado de execução no localStorage quando ele muda (apenas se não estiver usando estado externo)
  useEffect(() => {
    // Apenas salvar no localStorage se não estiver usando estado externo
    if (externalIsRunning === undefined) {
      localStorage.setItem(`task_timer_running_${taskId}`, isRunning.toString());
    }
  }, [isRunning, taskId, externalIsRunning]);

  // Referência para armazenar o intervalo atual
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Referência para armazenar o estado de execução anterior
  const prevIsRunningRef = useRef<boolean>(isRunning);

  // Efeito simplificado para controlar o timer
  // Usando useRef para evitar re-renderizações desnecessárias
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Na primeira renderização, apenas inicializar
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;

      // Se o timer já estiver em execução, iniciar o intervalo
      if (isRunning) {
        startTimer();
      }
      return;
    }

    // Limpar qualquer intervalo existente
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Se o timer estiver em execução, criar um novo intervalo
    if (isRunning) {
      startTimer();
    } else {
      // Remover o estado do localStorage
      localStorage.removeItem(`task_timer_running_${taskId}`);
    }

    // Função de limpeza
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]); // Removidas dependências em initialTime e time para evitar loops

  // Função para iniciar o timer
  const startTimer = () => {
    // Criar uma referência para contar os segundos
    const secondsCounterRef = { count: 0 };

    intervalRef.current = setInterval(() => {
      setTime(prevTime => {
        const newTime = prevTime + 1;

        // Incrementar o contador
        secondsCounterRef.count++;

        return newTime;
      });
    }, 1000);

    // Salvar o estado no localStorage
    localStorage.setItem(`task_timer_running_${taskId}`, 'true');
  };

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impedir propagação do evento para o card
    e.preventDefault(); // Impedir comportamento padrão do botão

    // TEMPORIZADOR DESABILITADO - não é prioridade corrigir bugs
    if (disabled) {
      toast.info("Temporizador temporariamente desabilitado", {
        description: "Esta funcionalidade será habilitada em breve após correções"
      });
      return;
    }

    // Primeiro, vamos determinar o novo estado
    const newRunningState = !isRunning;

    // Se estamos pausando o timer (ou seja, isRunning é true agora), enviar o tempo atual para o backend
    if (isRunning && onTimerUpdate) {
      // Garantir que o valor seja um número válido
      const timeValue = Number(time);

      if (isNaN(timeValue)) {
        // Usar 0 como valor padrão em caso de erro
        onTimerUpdate(0);
      } else {
        // Enviar o tempo atual para o backend (será somado ao valor anterior no componente pai)
        onTimerUpdate(timeValue);

        // Atualizar a referência do último valor inicial e o estado local
        lastInitialTimeRef.current = timeValue;
        setTime(timeValue); // Atualizar o estado local com o valor enviado para a API
      }

      // Salvar no localStorage que o timer foi pausado manualmente
      localStorage.setItem(`task_timer_manually_paused_${taskId}`, 'true');
    } else {
      // Se estamos iniciando o timer, remover a marca de pausa manual
      localStorage.removeItem(`task_timer_manually_paused_${taskId}`);
    }

    // Atualizar o estado de execução
    setIsRunning(newRunningState);

    // Atualizar o status da tarefa e mostrar toast
    if (newRunningState) {
      onStatusChange("Em Andamento");
      toast.success("Timer iniciado", {
        description: "A tarefa foi marcada como Em Andamento"
      });
    } else {
      onStatusChange("Pausado");
      toast.success("Timer pausado", {
        description: "A tarefa foi marcada como Pausada"
      });
    }
  };



  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    // Sempre usar o formato completo hh:mm:ss
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Adicionar classe de cor com base no status do temporizador
  const getTimerColorClass = () => {
    if (isRunning) {
      return "text-green-600";
    } else if (time > 0) {
      return "text-amber-600";
    }
    return "text-muted-foreground";
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <span className={`font-mono text-xs font-medium ${getTimerColorClass()}`} key={`timer-compact-${time}`}>{formatTime(time)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tempo de trabalho: {formatTime(time)}</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center ml-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-4 w-4 p-0 ${disabled ? 'opacity-30 cursor-not-allowed' : 'opacity-70 hover:opacity-100'} ${isRunning ? 'text-green-600' : ''}`}
                  onClick={toggleTimer}
                  type="button"
                  disabled={disabled}
                >
                  {isRunning ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{disabled ? 'Temporizador desabilitado temporariamente' : (isRunning ? 'Pausar' : 'Iniciar') + ' temporizador'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <span className={`font-mono text-sm ${getTimerColorClass()}`} key={`timer-${time}`}>{formatTime(time)}</span>
        <div className="flex items-center ml-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${isRunning ? 'bg-green-100 border-green-300' : ''}`}
                onClick={toggleTimer}
                type="button"
                disabled={disabled}
              >
                {isRunning ? (
                  <Pause className="h-4 w-4 text-green-600" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{disabled ? 'Temporizador desabilitado temporariamente' : (isRunning ? 'Pausar' : 'Iniciar') + ' temporizador'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
