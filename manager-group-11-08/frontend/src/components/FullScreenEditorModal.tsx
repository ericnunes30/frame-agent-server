import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RichTextEditor from '@/components/ui/RichTextEditor';

interface FullScreenEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSave: (newContent: string) => void;
}

const FullScreenEditorModal: React.FC<FullScreenEditorModalProps> = ({ isOpen, onClose, content, onSave }) => {
  const [editorContent, setEditorContent] = useState(content);
  const isCancellingRef = useRef(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const handleSave = () => {
    // Marca fluxo de salvamento explícito (botão "Salvar")
    isSavingRef.current = true;
    onSave(editorContent);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log('onOpenChange triggered:', { open, editorContent, isCancelling: isCancellingRef.current, isSaving: isSavingRef.current });
        if (!open) {
          // Fechando o modal
          if (isCancellingRef.current) {
            // Cancelar: fechar sem salvar
            console.log('Fechando via cancelar - não salvando');
            isCancellingRef.current = false;
            onClose();
            return;
          }
          if (isSavingRef.current) {
            // Já salvamos via botão "Salvar"
            console.log('Fechando via salvar - já salvou');
            isSavingRef.current = false;
            onClose();
            return;
          }
          // Fechamento via X/click fora: salvar temporariamente
          console.log('Fechando via X/click fora - salvando temporariamente:', editorContent);
          onSave(editorContent);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[80vw] h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Editar Descrição (Tela Cheia)</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4">
          <RichTextEditor
            content={editorContent}
            onChange={setEditorContent}
            editable={true}
          />
        </div>
        <DialogFooter className="p-4 border-t flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              // Marca como cancelamento para não salvar ao fechar
              isCancellingRef.current = true;
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FullScreenEditorModal;