# API de Gerenciamento de Projetos e Tarefas

Este documento descreve a API do sistema de gerenciamento de projetos e tarefas desenvolvido com AdonisJS 6.

## Configuração do Ambiente

1. Instale as dependências:
```
npm install
```

2. Configure o banco de dados no arquivo `.env`:
```
DB_CONNECTION=pg
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=123456
PG_DB_NAME=manager_team2
```

3. Execute as migrações:
```
node ace migration:run
```

4. Execute os seeders para popular o banco de dados:
```
node ace db:seed
```

5. Inicie o servidor:
```
node ace serve
```

6. (Opcional) Inicie o worker de agendamento em um terminal separado:
```
node ace scheduler:work
```

## Autenticação

A API utiliza autenticação JWT. Para acessar as rotas protegidas, é necessário obter um token de acesso através da rota de login.

### Cabeçalhos de Requisição

Para todas as rotas protegidas, inclua o seguinte cabeçalho:
```
Authorization: Bearer SEU_TOKEN_AQUI
```

Para requisições que enviam dados (POST, PUT, PATCH), inclua também:
```
Content-Type: application/json
```

### Rota de Login

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| POST | `/session` | Login na aplicação | Não | Content-Type: application/json |

**Corpo da Requisição:**
```
{
  "email": "admin@example.com",      // Obrigatório
  "password": "password123"          // Obrigatório
}
```

**Exemplo de Resposta:**
```
{
  "type": "bearer",
  "token": "oat_NQ.RUdJZTJpWE1pdkJVb2UyNnRfQnYyNlZucTd6T2VUdUt6QUU5azF6VTIwMTY5ODExMDU",
  "abilities": ["*"]
}
```

## Rotas da API

### Usuários

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/user` | Listar usuários | Sim | Authorization: Bearer TOKEN |
| POST | `/user` | Criar usuário | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/user/:id` | Obter usuário | Sim | Authorization: Bearer TOKEN |
| PUT/PATCH | `/user/:id` | Atualizar usuário | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/user/:id` | Excluir usuário | Sim | Authorization: Bearer TOKEN |

**Corpo da Requisição (POST):**
```
{
  "name": "Nome do Usuário",        // Obrigatório
  "email": "usuario@example.com",    // Obrigatório
  "password": "senha123",            // Obrigatório
  "occupation_id": 1,                // Opcional
  "roles": [1, 3]                    // Opcional - IDs das funções
}
```

**Corpo da Requisição (PUT/PATCH):**
```
{
  "name": "Nome do Usuário",        // Opcional
  "email": "usuario@example.com",    // Opcional
  "password": "senha123",            // Opcional
  "occupation_id": 1,                // Opcional
  "roles": [1, 3]                    // Opcional - IDs das funções
}
```

### Projetos

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/project` | Listar projetos | Sim | Authorization: Bearer TOKEN |
| POST | `/project` | Criar projeto | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/project/:id` | Obter projeto | Sim | Authorization: Bearer TOKEN |
| PUT/PATCH | `/project/:id` | Atualizar projeto | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/project/:id` | Excluir projeto | Sim | Authorization: Bearer TOKEN |

**Corpo da Requisição (POST):**
```
{
  "title": "Título do Projeto",              // Obrigatório
  "description": "Descrição do projeto",    // Obrigatório
  "priority": "alta",                       // Obrigatório
  "status": true,                           // Obrigatório
  "start_date": "2025-05-01",               // Obrigatório
  "end_date": "2025-06-30",                 // Obrigatório
  "users": [1, 3],                          // Opcional - IDs dos usuários
  "occupations": [2, 4]                     // Opcional - IDs das ocupações
}
```

**Corpo da Requisição (PUT/PATCH):**
```
{
  "title": "Título do Projeto",              // Opcional
  "description": "Descrição do projeto",    // Opcional
  "priority": "alta",                       // Opcional
  "status": true,                           // Opcional
  "start_date": "2025-05-01",               // Opcional
  "end_date": "2025-06-30",                 // Opcional
  "users": [1, 3],                          // Opcional - IDs dos usuários
  "occupations": [2, 4]                     // Opcional - IDs das ocupações
}
```

**Valores para o campo priority:**
- baixa
- media
- alta
- urgente

**Valores para o campo status:**
- true (ativo)
- false (inativo)

### Tarefas Recorrentes
| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/recurring-task` | Listar tarefas recorrentes | Sim | Authorization: Bearer TOKEN |
| POST | `/recurring-task` | Criar tarefa recorrente | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/recurring-task/:id` | Obter tarefa recorrente | Sim | Authorization: Bearer TOKEN |
| PUT/PATCH | `/recurring-task/:id` | Atualizar tarefa recorrente | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/recurring-task/:id` | Excluir tarefa recorrente | Sim | Authorization: Bearer TOKEN |

**Corpo da Requisição (POST):**
```
{
  "name": "Nome da Regra de Recorrência",
  "schedule_type": "interval",
  "frequency_interval": "7 days",
  "frequency_cron": null,
  "next_due_date": "2025-07-01T09:00:00.000-03:00",
  "is_active": true,
  "userId": 1,
  "projectId": 1,
  "templateData": {
    "title": "Template do Título da Tarefa",
    "description": "Template da descrição",
    "priority": "media",
    "assignee_ids": [1, 2],
    "occupations": [3, 4]
  }
}
```

**Corpo da Requisição (PUT/PATCH):**
```
{
  "name": "Novo nome da Regra",
  "is_active": false
}
```

**Valores para o campo schedule_type:**
- interval
- cron

### Tarefas

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/task` | Listar tarefas | Sim | Authorization: Bearer TOKEN |
| POST | `/task` | Criar tarefa | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/task/:id` | Obter tarefa | Sim | Authorization: Bearer TOKEN |
| PATCH | `/task/:id` | Atualizar tarefa | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/task/:id` | Excluir tarefa | Sim | Authorization: Bearer TOKEN |
| GET | `/task/:taskId/history` | Obter histórico de atividades de uma tarefa (paginado) | Sim | Authorization: Bearer TOKEN |
**Corpo da Requisição (POST):**
```
{
  "title": "Título da Tarefa",               // Obrigatório
  "description": "Descrição da tarefa",     // Obrigatório
  "priority": "media",                       // Obrigatório
  "status": "a_fazer",                      // Obrigatório
  "start_date": "2025-05-05",               // Obrigatório
  "due_date": "2025-05-15",                 // Obrigatório
  "project_id": 1,                          // Obrigatório
  "order": 1,                               // Opcional
  "timer": 0,                               // Opcional - Tempo em segundos
  "users": [4, 5],                          // Opcional - IDs dos usuários
  "occupations": [2, 3]                     // Opcional - IDs das ocupações
}
```

**Corpo da Requisição (PATCH):**
```
{
  "title": "Título da Tarefa",               // Opcional
  "description": "Descrição da tarefa",     // Opcional
  "priority": "media",                       // Opcional
  "status": "a_fazer",                      // Opcional
  "start_date": "2025-05-05",               // Opcional
  "due_date": "2025-05-15",                 // Opcional
  "project_id": 1,                          // Opcional
  "order": 1,                               // Opcional
  "timer": 3600,                            // Opcional - Tempo em segundos (exemplo: 1 hora)
  "users": [4, 5],                          // Opcional - IDs dos usuários
  "occupations": [2, 3]                     // Opcional - IDs das ocupações
}
```

**Valores para o campo priority:**
- baixa
- media
- alta
- urgente

**Valores para o campo status:**
- pendente
- a_fazer
- em_andamento
- em_revisao
- concluido

### Tarefas Recorrentes

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/recurring-task` | Listar tarefas recorrentes | Sim | Authorization: Bearer TOKEN |
| POST | `/recurring-task` | Criar tarefa recorrente | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/recurring-task/:id` | Obter tarefa recorrente | Sim | Authorization: Bearer TOKEN |
| PUT/PATCH | `/recurring-task/:id` | Atualizar tarefa recorrente | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/recurring-task/:id` | Excluir tarefa recorrente | Sim | Authorization: Bearer TOKEN |

**Corpo da Requisição (POST):**
```
{
  "name": "Nome da Regra de Recorrência",
  "schedule_type": "interval",
  "frequency_interval": "7 days",
  "frequency_cron": null,
  "next_due_date": "2025-07-01T09:00:00.000-03:00",
  "is_active": true,
  "userId": 1,
  "projectId": 1,
  "templateData": {
    "title": "Template do Título da Tarefa",
    "description": "Template da descrição",
    "priority": "media",
    "assignee_ids": [1, 2],
    "occupations": [3, 4]
  }
}
```

**Corpo da Requisição (PUT/PATCH):**
```
{
  "name": "Novo nome da Regra",
  "is_active": false
}
```

**Valores para o campo schedule_type:**
- interval
- cron

### Comentários

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/comment/task/:taskId` | Listar comentários de nível superior de uma tarefa (paginado) | Sim | Authorization: Bearer TOKEN |
| GET | `/comment/:commentId/replies` | Listar respostas de um comentário (paginado) | Sim | Authorization: Bearer TOKEN |
| POST | `/comment/:commentId/like` | Curtir um comentário | Sim | Authorization: Bearer TOKEN |
| DELETE | `/comment/:commentId/like` | Remover curtida de um comentário | Sim | Authorization: Bearer TOKEN |
| GET | `/comment` | Listar comentários (geralmente do usuário autenticado) | Sim | Authorization: Bearer TOKEN |
| POST | `/comment` | Criar comentário | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/comment/:id` | Obter comentário espec��fico | Sim | Authorization: Bearer TOKEN |
| PUT/PATCH | `/comment/:id` | Atualizar comentário | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/comment/:id` | Excluir comentário | Sim | Authorization: Bearer TOKEN |

**Corpo da Requisição (POST):**
```
{
  "content": "Conteúdo do comentário",     // Obrigatório
  "task_id": 1,                           // Obrigatório - ID da tarefa
  "parent_id": null                       // Opcional - ID do comentário pai (para respostas)
}
```

**Corpo da Requisição (PUT/PATCH):**
```
{
  "content": "Conteúdo atualizado"         // Obrigatório
}
```

### Ocupações

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/occupation` | Listar ocupações | Sim | Authorization: Bearer TOKEN |
| POST | `/occupation` | Criar ocupação | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/occupation/:id` | Obter ocupação | Sim | Authorization: Bearer TOKEN |
| PUT/PATCH | `/occupation/:id` | Atualizar ocupação | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/occupation/:id` | Excluir ocupação | Sim | Authorization: Bearer TOKEN |

**Corpo da Requisição (POST):**
```
{
  "name": "Nome da Ocupação",           // Obrigatório
  "description": "Descrição da ocupação"  // Obrigatório
}
```

**Corpo da Requisição (PUT/PATCH):**
```
{
  "name": "Nome da Ocupação",           // Opcional
  "description": "Descrição da ocupação"  // Opcional
}
```

### Funções (Roles)

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/role` | Listar funções | Sim | Authorization: Bearer TOKEN |
| POST | `/role` | Criar função | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/role/:id` | Obter função | Sim | Authorization: Bearer TOKEN |
| PUT/PATCH | `/role/:id` | Atualizar função | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/role/:id` | Excluir função | Sim | Authorization: Bearer TOKEN |

**Corpo da Requisição (POST):**
```
{
  "name": "Nome da Função",             // Obrigatório
  "description": "Descrição da função"    // Obrigatório
}
```

**Corpo da Requisição (PUT/PATCH):**
```
{
  "name": "Nome da Função",             // Opcional
  "description": "Descrição da função"    // Opcional
}
```

## Exemplos de Uso

### Criar um Projeto

```
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "title": "Novo Projeto",
    "description": "Descrição do novo projeto",
    "priority": "alta",
    "status": true,
    "start_date": "2025-05-01",
    "end_date": "2025-06-30",
    "users": [1, 3],
    "occupations": [2, 4]
  }' \
  http://localhost:3333/project
```

### Criar uma Tarefa

```
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "title": "Nova Tarefa",
    "description": "Descrição da nova tarefa",
    "priority": "media",
    "status": "a_fazer",
    "start_date": "2025-05-05",
    "due_date": "2025-05-15",
    "project_id": 1,
    "order": 1,
    "timer": 0,
    "users": [4, 5],
    "occupations": [2, 3]
  }' \
  http://localhost:3333/task
```

### Adicionar um Comentário

```
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "content": "Este é um comentário de teste",
    "task_id": 1
  }' \
  http://localhost:3333/comment
```

### Atualizar uma Tarefa

```
curl -X PATCH \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "title": "Tarefa Atualizada",
    "description": "Descrição atualizada",
    "priority": "alta",
    "status": "em_andamento",
    "timer": 1800
  }' \
  http://localhost:3333/task/1
```

## Modelos e Relacionamentos

### User (Usuário)
- **Relacionamentos**:
  - Muitos para muitos com Role (roles)
  - Muitos para muitos com Project (projects)
  - Muitos para muitos com Task (tasks)
  - Um para muitos com Comment (comments)
  - Pertence a uma Occupation (occupation)

### Project (Projeto)
- **Relacionamentos**:
  - Um para muitos com Task (tasks)
  - Muitos para muitos com User (users)
  - Muitos para muitos com Occupation (occupations)

### Task (Tarefa)
- **Campos Especiais**:
  - **timer**: Armazena o tempo em segundos dedicado à tarefa
- **Relacionamentos**:
  - Pertence a um Project (project)
  - Muitos para muitos com User (users)
  - Muitos para muitos com Occupation (occupations)
  - Um para muitos com Comment (comments)
- **Log de Atividades**: Alterações nos campos da tarefa (título, descrição, prioridade, status, datas, projeto) e na lista de responsáveis (`users`) são automaticamente registradas no `ActivityLog`. Consulte a rota `GET /task/:taskId/history` para visualizar o histórico.

### Comment (Comentário)
- **Campos Adicionais**:
  - `parentId`: ID do comentário pai (para respostas aninhadas).
  - `likesCount`: Número de curtidas (atualizado automaticamente).
- **Relacionamentos**:
  - Pertence a uma Task (task)
  - Pertence a um User (user) - Autor do comentário.
  - Pertence a um Comment (parentComment) - Comentário pai.
  - Um para muitos com Comment (replies) - Respostas a este comentário.
  - Muitos para muitos com User (mentionedUsers) - Usuários mencionados.
  - Um para muitos com CommentLike (likes) - Curtidas recebidas.
- **Log de Atividades**: A criação (`COMMENT_CREATED`), atualização (`COMMENT_UPDATED`), curtida (`COMMENT_LIKED`) e descurtida (`COMMENT_UNLIKED`) de comentários são automaticamente registradas no `ActivityLog`.

### Occupation (Ocupação)
- **Relacionamentos**:
  - Um para muitos com User (users)
  - Muitos para muitos com Project (projects)
  - Muitos para muitos com Task (tasks)

### Role (Função)
- **Relacionamentos**:
  - Muitos para muitos com User (users)

### CommentLike (Curtida de Comentário)
- **Descrição**: Representa uma curtida de um usuário em um comentário.
- **Relacionamentos**:
  - Pertence a um User (user) - Quem curtiu.
  - Pertence a um Comment (comment) - Qual comentário foi curtido.

### ActivityLog (Log de Atividade)
- **Descrição**: Registra eventos importantes que ocorrem no sistema. Atualmente, o sistema registra automaticamente alterações em Tarefas (campos diretos e responsáveis), criação/edição de Comentários e ações de curtir/descurtir comentários.
- **Campos Principais**: `actionType`, `changedField`, `oldValue`, `newValue`, `referenceId`, `details` (JSON).
- **Relacionamentos**:
  - Pertence a um User (user) - Quem realizou a ação (pode ser nulo).
  - Pertence a uma Task (task) - Tarefa relacionada (pode ser nulo).
