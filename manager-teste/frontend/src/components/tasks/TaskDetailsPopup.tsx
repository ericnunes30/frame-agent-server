import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ExternalLink, 
  Video, 
  FileText
} from "lucide-react";
import { Task } from "@/common/types";

interface TaskDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

const TaskDetailsPopup: React.FC<TaskDetailsPopupProps> = ({ 
  isOpen, 
  onClose, 
  task 
}) => {
  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  const videoId = task.video_url ? getYouTubeVideoId(task.video_url) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Detalhes da Tarefa: {task.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[70vh]">
          <div className="space-y-6">
            {/* YouTube Video */}
            {task.video_url && videoId && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Vídeo Explicativo</h3>
                </div>
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full rounded-lg border"
                  />
                </div>
              </div>
            )}

            {/* Invalid Video URL Fallback */}
            {task.video_url && !videoId && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Vídeo Explicativo</h3>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    URL do vídeo não é válida ou não suportada.
                  </p>
                  <a 
                    href={task.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Abrir link externo <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Useful Links */}
            {task.useful_links && task.useful_links.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Links Úteis</h3>
                  </div>
                  <div className="grid gap-3">
                    {task.useful_links.map((link, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{link.title}</h4>
                          <p className="text-xs text-muted-foreground truncate max-w-md">
                            {link.url}
                          </p>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0"
                        >
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Observations */}
            {task.observations && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Observações</h3>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/10">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {task.observations}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Empty State */}
            {!task.video_url && (!task.useful_links || task.useful_links.length === 0) && !task.observations && (
              <div className="text-center py-12">
                <div className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4">
                  <FileText className="h-full w-full" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Nenhum detalhe adicional
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Esta tarefa não possui vídeos, links úteis ou observações adicionais.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsPopup;