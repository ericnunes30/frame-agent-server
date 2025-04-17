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

### Tarefas

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/task` | Listar tarefas | Sim | Authorization: Bearer TOKEN |
| POST | `/task` | Criar tarefa | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/task/:id` | Obter tarefa | Sim | Authorization: Bearer TOKEN |
| PUT/PATCH | `/task/:id` | Atualizar tarefa | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/task/:id` | Excluir tarefa | Sim | Authorization: Bearer TOKEN |

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
  "users": [4, 5],                          // Opcional - IDs dos usuários
  "occupations": [2, 3]                     // Opcional - IDs das ocupações
}
```

**Corpo da Requisição (PUT/PATCH):**
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

### Comentários

| Método | Rota | Descrição | Autenticação | Cabeçalhos |
|--------|------|-----------|--------------|------------|
| GET | `/comment` | Listar comentários | Sim | Authorization: Bearer TOKEN |
| POST | `/comment` | Criar comentário | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| GET | `/comment/:id` | Obter comentário | Sim | Authorization: Bearer TOKEN |
| PUT/PATCH | `/comment/:id` | Atualizar comentário | Sim | Authorization: Bearer TOKEN<br>Content-Type: application/json |
| DELETE | `/comment/:id` | Excluir comentário | Sim | Authorization: Bearer TOKEN |

**Corpo da Requisição (POST):**
```
{
  "content": "Conteúdo do comentário",     // Obrigatório
  "task_id": 1                            // Obrigatório - ID da tarefa
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
- **Relacionamentos**:
  - Pertence a um Project (project)
  - Muitos para muitos com User (users)
  - Muitos para muitos com Occupation (occupations)
  - Um para muitos com Comment (comments)

### Comment (Comentário)
- **Relacionamentos**:
  - Pertence a uma Task (task)
  - Pertence a um User (user)

### Occupation (Ocupação)
- **Relacionamentos**:
  - Um para muitos com User (users)
  - Muitos para muitos com Project (projects)
  - Muitos para muitos com Task (tasks)

### Role (Função)
- **Relacionamentos**:
  - Muitos para muitos com User (users)
