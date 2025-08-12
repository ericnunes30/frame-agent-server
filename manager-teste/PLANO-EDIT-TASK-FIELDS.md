# Plano: Implementar Edição dos Novos Campos de Task

## Objetivo
Implementar a edição dos novos campos (video_url, useful_links, observations) no formulário de edição de tasks, permitindo que tarefas antigas sejam atualizadas com essas informações.

## Preparação do Ambiente

**0. Criar Nova Branch**
   - Criar branch específica para esta feature
   - Nome: `feature/edit-task-new-fields`
   - Comando: `git checkout -b feature/edit-task-new-fields`

## Análise Necessária

**1. Backend API Update (Task Controller)**
   - Verificar se o endpoint PUT/PATCH de tasks processa `video_url`, `useful_links` e `observations`
   - Conferir validação dos novos campos no validator
   - Localização: `backend/app/controllers/task_controller.ts`
   - Validator: `backend/app/validators/task.ts`

**2. Frontend Form de Edição**
   - Localizar componente TaskForm ou modal de edição
   - Verificar se os campos estão incluídos no formulário de edição
   - Analisar integração com API de update
   - Provável localização: `frontend/src/components/forms/TaskForm.tsx`

**3. Verificar Campos Ausentes**
   - Comparar form de criação vs form de edição
   - Identificar quais campos novos estão ausentes no edit

## Implementação

**4. Adicionar Campos no Form de Edição**
   - Incluir campos video_url, useful_links e observations no formulário
   - Garantir que os valores atuais sejam carregados para edição
   - Manter consistência com o form de criação
   - Usar mesmos componentes UI (RichTextEditor, Input, etc.)

**5. Commits Estratégicos**
   - **Commit 1**: "feat: adiciona campos video_url, useful_links e observations no form de edição de tasks"
   - **Commit 2**: "test: valida funcionalidade de edição dos novos campos e ajustes finais"

## Validação e Testes

**6. Testar Funcionalidade**
   - Testar edição de tasks existentes com novos campos
   - Verificar persistência dos dados no backend
   - Validar interface e experiência do usuário
   - Testar com tasks que já possuem dados nos novos campos
   - Testar com tasks antigas que não possuem dados nos novos campos

## Critérios de Sucesso

- ✅ API backend processa corretamente os novos campos na edição
- ✅ Form de edição inclui todos os novos campos
- ✅ Valores existentes são carregados corretamente para edição
- ✅ Novos valores são salvos corretamente no backend
- ✅ Interface mantém consistência com form de criação
- ✅ Tasks antigas podem ser atualizadas com as novas informações

## Observações Técnicas

- Novos campos conforme CLAUDE.md:
  - `video_url`: URL do vídeo relacionado à task
  - `useful_links`: Links úteis (array/JSON)
  - `observations`: Observações adicionais (rich text)
- Manter consistência com implementação já existente no form de criação
- Seguir padrões estabelecidos no projeto (TypeScript, validações, etc.)