import React, { useState, FormEvent, useEffect } from 'react'; // Adicionado FormEvent e useEffect
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Adicionado Textarea
import { Heart, MessageSquare } from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Comment as ApiComment, User as ApiUser } from '@/common/types'; // Importar a interface Comment e User
import { useBackendServices } from '@/hooks/useBackendServices'
import { useAuth } from '@/contexts/AuthContext'; // Importar useAuth
import { toast } from "sonner";

interface CommentItemProps {
  comment: ApiComment;
  parentTaskId: number; // ID da tarefa pai, passado do modal
  isReply?: boolean; // Para aplicar indentação
  onReplySuccessfullyAdded?: () => void; // Callback para notificar o pai
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, parentTaskId, isReply = false, onReplySuccessfullyAdded }) => {
  // --- Lógica de Curtidas (Movida do TaskDetailsModal) ---
  const [isLiked, setIsLiked] = useState(false); // Começa false (sem checkIfLiked)
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const { comments } = useBackendServices();
  const { mutateAsync: createComment } = comments.useCreateComment();
  const { mutateAsync: deleteCommentMutation } = comments.useDeleteComment();
  const { mutateAsync: likeComment } = comments.useLikeComment();
  const { mutateAsync: unlikeComment } = comments.useUnlikeComment();

  const handleLikeToggle = async () => {
    if (isLiking) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        await unlikeComment(comment.id);
        setLikesCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        await likeComment(comment.id);
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
      }
      
      
        // --- Lógica de Curtidas (Movida do TaskDetailsModal) ---
        // console.log('CommentItem Props:', comment); // Descomente para depurar props iniciais
    } catch (error) {
      console.error('Erro ao processar curtida:', error);
      toast.error('Erro ao processar curtida.');
    } finally {
      setIsLiking(false);
    }
  };
  // --- Fim da Lógica de Curtidas ---

  // --- Lógica de Respostas (Agora usa dados pré-carregados) ---
  // As respostas agora v��m de comment.replies se pré-carregadas pelo backend.
  // O estado showReplies e a função toggleShowReplies são removidos,
  // pois as respostas serão sempre visíveis se existirem.
  // A função loadReplies e os estados isLoadingReplies/setReplies não são mais necessários
  // para buscar dados, pois esperamos que comment.replies já contenha as respostas.
  // No entanto, setReplies ainda é usado em handleReplySubmit para adicionar uma nova resposta localmente.
  // Vamos ajustar isso: a nova resposta deve ser adicionada ao array `comment.replies` se possível,
  // ou precisaremos de uma forma de atualizar o componente pai (TaskDetailsModal) para recarregar a tarefa.
  // Por enquanto, para simplificar a exibição inicial, vamos focar em usar comment.replies.
  // A atualização otimista em handleReplySubmit precisará ser revista.

  // Para a atualização otimista em handleReplySubmit, precisamos de um estado local para as respostas
  // que é inicializado com comment.replies mas pode ser modificado.
  const [localReplies, setLocalReplies] = useState<ApiComment[]>(comment.replies || []);

  // Atualizar localReplies se comment.replies mudar (ex: após recarregar a tarefa)
  useEffect(() => {
    setLocalReplies(comment.replies || []);
  }, [comment.replies]);

  // Modificar handleReplySubmit para usar setLocalReplies
  // (Esta parte já está no c��digo, mas precisa usar setLocalReplies em vez de setReplies)
  // A linha 114 em handleReplySubmit: setReplies(prev => [replyWithUser, ...prev]);
  // DEVE SER ALTERADA PARA: setLocalReplies(prev => [replyWithUser, ...prev]);
  // Esta alteração será feita em um diff separado para handleReplySubmit.
  // --- Fim da Lógica de Respostas ---

  // --- Lógica do Formulário de Resposta ---
  const { user: authUser } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const commentData = {
        content: replyContent,
        task_id: parentTaskId, // Usar o ID da tarefa pai passado como prop
        parentId: isReply ? comment.parentId : comment.id // Se for resposta, usa o parentId do pai, senão o id do comentário atual
      };

      console.log('CommentItem - Enviando dados da resposta:', commentData);
      const newReply = await createComment(commentData);

      // Enriquecer a resposta com dados do usuário
      const replyWithUser: ApiComment = {
        ...newReply,
        user: authUser ? {
          id: authUser.id,
          name: authUser.name || 'Usuário Desconhecido',
          // avatar_url: authUser.avatar_url, // Adicionar se disponível e necessário
        } as ApiUser : undefined, // Cast para ApiUser
        likesCount: 0, // Nova resposta come��a com 0 curtidas
        repliesCount: 0, // Nova resposta começa com 0 sub-respostas
      };

      // setLocalReplies(prev => [replyWithUser, ...prev]); // Remover atualização otimista local
      setReplyContent('');
      setIsReplying(false);
      if (onReplySuccessfullyAdded) {
        onReplySuccessfullyAdded(); // Chamar o callback para o pai recarregar
      }
      // setShowReplies(true); // Não é mais necessário

      // Atualizar contagem de respostas no comentário pai (se a prop for mutável ou tivermos um callback)
      // Por simplicidade, vamos assumir que o backend atualiza e um re-fetch dos comentários principais traria isso.
      // Ou, se o objeto 'comment' for mutável (não ideal), poderíamos fazer:
      // if (comment.repliesCount !== undefined) {
      //   comment.repliesCount += 1;
      // }
      toast.success('Resposta enviada!');
    } catch (error) {
      console.error('CommentItem - Erro ao enviar resposta:', error);
      if (error.response?.data?.errors) {
        console.error('CommentItem - Erros de validação:', error.response.data.errors);
      }
      toast.error('Erro ao enviar resposta.');
    } finally {
      setIsSubmittingReply(false);
    }
  };
  // --- Fim da Lógica do Formulário de Resposta ---

  // Formatação da data (similar ao TaskDetailsModal)
  const dateString = comment.createdAt;
  let formattedDate = "Data inválida";
  if (dateString) {
    const date = parseISO(dateString);
    if (isValid(date)) {
      formattedDate = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    }
  }

  // Formatação do conteúdo (placeholder, pode precisar da função real do TaskDetailsModal)
  const formatCommentContent = (content: string) => {
    // TODO: Implementar a lógica de formatação de menções se necessário
    return content;
  };

  return (
    <div className={`flex gap-3 ${isReply ? 'mt-4' : ''}`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/10 text-primary">
          {comment.user?.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-medium">{comment.user?.name}</span>
            {/* Adicionar lógica para exibir se é uma resposta a algu��m, se necessário */}
          </div>
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        </div>

        <div className="mt-1 text-sm break-words prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80 [&_br]:block [&_br]:mb-2 [&_p:empty]:h-6 [&_p:empty]:block" style={{ wordBreak: 'break-all' }}>
          <div dangerouslySetInnerHTML={{ __html: comment.content }} />
        </div>

        {/* Ações de comentário */}
        <div className="flex items-center gap-4 mt-2">
          {/* Botão Curtir */}
          <button
            onClick={handleLikeToggle}
            disabled={isLiking}
            className={`text-xs flex items-center gap-1 ${
              isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart
              size={14}
              className={isLiked ? 'fill-red-500' : ''}
            />
            <span>{likesCount}</span>
          </button>

          {/* Botão Responder agora é sempre visível, mas a lógica de parentId foi ajustada */}
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <MessageSquare className="h-3 w-3" />
            {isReplying ? 'Cancelar' : 'Responder'}
          </button>
        </div> {/* Esta div fecha o flex das ações de comentário */}

        {/* Formulário de Resposta */}

        {/* Formulário de Resposta (apenas para comentários de nível principal) */}

        {/* Formulário de Resposta (apenas para comentários de nível principal) */}
        {isReplying && ( // Formulário é mostrado se isReplying for true, independentemente de isReply
          <form onSubmit={handleReplySubmit} className="mt-3 ml-0"> {/* Removido ml-10 para alinhar com o início do comentário */}
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Escreva sua resposta..."
              className="w-full p-2 border rounded-md text-sm break-words" // Adicionado text-sm e break-words
              rows={2}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                type="button"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent(''); // Limpar conteúdo ao cancelar
                }}
                variant="ghost" // Estilo mais sutil para cancelar
                size="sm"
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingReply || !replyContent.trim()}
                size="sm"
                className="text-xs"
              >
                {isSubmittingReply ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </form>
        )}

        {/* Botão e Área de Respostas */}
        {/* O botão para mostrar/ocultar respostas foi removido. */}

        {/* Renderiza diretamente as respostas se existirem em localReplies */}
        {localReplies && localReplies.length > 0 && (
          <div className="pl-6 mt-2 border-l-2 border-gray-200">
            {/* O console.log aqui foi removido para evitar erro de tipo ReactNode */}
            {localReplies.length > 0 ? ( // Usa localReplies para o map
              localReplies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  parentTaskId={parentTaskId} // Passar o taskId da tarefa original
                  isReply={true}
                  onReplySuccessfullyAdded={onReplySuccessfullyAdded} // Passar o callback para as respostas
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">Nenhuma resposta.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;