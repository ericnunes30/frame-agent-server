
import React, { useState, useEffect } from 'react';
import { Play, Pause, Timer as TimerIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TaskTimerProps {
  taskId: string;
  onStatusChange: (status: string) => void;
}

export const TaskTimer: React.FC<TaskTimerProps> = ({ taskId, onStatusChange }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    
    if (!isRunning) {
      onStatusChange("Em Andamento");
      toast({
        title: "Timer iniciado",
        description: "A tarefa foi marcada como Em Andamento"
      });
    } else {
      onStatusChange("Pausado");
      toast({
        title: "Timer pausado",
        description: "A tarefa foi marcada como Pausada"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      <TimerIcon className="h-4 w-4 text-muted-foreground" />
      <span className="font-mono text-sm">{formatTime(time)}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={toggleTimer}
      >
        {isRunning ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
