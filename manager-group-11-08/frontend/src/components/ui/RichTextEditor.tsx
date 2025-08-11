import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Maximize, // Adicionado ícone de maximizar
  CornerDownLeft, // Ícone para quebra de linha
} from 'lucide-react';

interface RichTextEditorProps {
  onExpand?: () => void; // Nova prop para o modo tela cheia
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, editable = true, onExpand }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: {
          keepMarks: false,
          HTMLAttributes: {
            class: 'hard-break',
          },
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();
      console.log('Editor HTML updated:', htmlContent); // Log para depuração
      onChange(htmlContent);
    },
    editable: editable,
    parseOptions: {
      preserveWhitespace: 'full',
    },
  });

  useEffect(() => {
    if (editor && editable) {
      editor.commands.focus();
    }
  }, [editor, editable]);

  // Atualizar o conteúdo do editor quando a prop content mudar
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md">
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b">
          <Button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            variant="ghost"
            size="sm"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            variant="ghost"
            size="sm"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editor.can().chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            variant="ghost"
            size="sm"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editor.can().chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            variant="ghost"
            size="sm"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={!editor.can().chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            variant="ghost"
            size="sm"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            variant="ghost"
            size="sm"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={!editor.can().chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            variant="ghost"
            size="sm"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={!editor.can().chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            variant="ghost"
            size="sm"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().setHardBreak().run()}
            disabled={!editor.can().setHardBreak()}
            variant="ghost"
            size="sm"
            title="Quebra de linha (Shift+Enter)"
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            variant="ghost"
            size="sm"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            variant="ghost"
            size="sm"
          >
            <Redo className="h-4 w-4" />
          </Button>
          {onExpand && ( // Renderiza o botão de expandir apenas se a prop onExpand for fornecida
            <Button
              onClick={onExpand}
              variant="ghost"
              size="sm"
              title="Expandir para tela cheia"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <EditorContent 
        editor={editor} 
        className="p-2 min-h-[100px] prose prose-sm max-w-none [&_br]:block [&_br]:mb-2 [&_.hard-break]:block [&_.hard-break]:mb-2 [&_p:empty]:h-6 [&_p:empty]:block" 
      />
    </div>
  );
};

export default RichTextEditor;