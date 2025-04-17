// Este arquivo é apenas para teste e depuração
// Pode ser executado no console do navegador para testar a atualização de uma tarefa

// Função para testar a atualização de uma tarefa
async function testUpdateTaskCorrect() {
  // ID da tarefa a ser atualizada
  const taskId = 3;
  
  // Dados da tarefa para atualização com os nomes de campos corretos
  const taskData = {
    title: "Tarefa de Teste Atualizada",
    description: "Descrição atualizada para teste",
    priority: "media",
    status: "a_fazer",
    startDate: new Date().toISOString(), // Nome correto: startDate em vez de start_date
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Nome correto: dueDate em vez de due_date
    projectId: 1, // Nome correto: projectId em vez de project_id
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
// testUpdateTaskCorrect();
