// Exemplo de requisição para atualizar uma tarefa
// Este arquivo é apenas para referência e depuração

// Formato esperado pelo backend (baseado no validator)
const updateTaskRequest = {
  // Campos obrigatórios
  title: "Título da Tarefa",
  description: "Descrição da tarefa",
  priority: "media", // Deve ser um dos valores: 'baixa', 'media', 'alta', 'urgente'
  status: "a_fazer", // Deve ser um dos valores: 'pendente', 'a_fazer', 'em_andamento', 'em_revisao', 'concluido'
  start_date: "2023-09-15T00:00:00.000Z", // Formato ISO
  due_date: "2023-09-20T00:00:00.000Z", // Formato ISO
  project_id: 1, // Deve ser um número
  
  // Campos opcionais
  order: 1, // Opcional
  users: [1, 2], // Array de IDs de usuários
  occupations: [1] // Array de IDs de ocupações
};

// Exemplo de como usar o serviço para atualizar uma tarefa
const updateTask = async () => {
  try {
    const taskId = 3; // ID da tarefa a ser atualizada
    const response = await fetch(`http://localhost:3333/task/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer SEU_TOKEN_AQUI'
      },
      body: JSON.stringify(updateTaskRequest)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao atualizar tarefa:', errorData);
      return;
    }
    
    const data = await response.json();
    console.log('Tarefa atualizada com sucesso:', data);
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
  }
};
