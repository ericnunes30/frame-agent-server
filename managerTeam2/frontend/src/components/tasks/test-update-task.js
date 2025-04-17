// Este arquivo é apenas para teste e depuração
// Pode ser executado no console do navegador para testar a atualização de uma tarefa

// Função para testar a atualização de uma tarefa
async function testUpdateTask() {
  // ID da tarefa a ser atualizada
  const taskId = 3;
  
  // Dados da tarefa para atualização
  const taskData = {
    title: "Tarefa de Teste Atualizada",
    description: "Descrição atualizada para teste",
    priority: "media",
    status: "a_fazer",
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias a partir de hoje
    project_id: 1,
    order: 1,
    users: [1],
    occupations: [1]
  };
  
  try {
    // Obter o token de autenticação
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token de autenticação não encontrado!');
      return;
    }
    
    // Enviar a requisição para a API
    const response = await fetch(`http://localhost:3333/task/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    });
    
    // Verificar se a requisição foi bem-sucedida
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao atualizar tarefa:', errorData);
      return;
    }
    
    // Obter os dados da tarefa atualizada
    const data = await response.json();
    console.log('Tarefa atualizada com sucesso:', data);
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
  }
}

// Executar o teste
// testUpdateTask();
