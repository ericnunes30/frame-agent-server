import scheduler from 'adonisjs-scheduler/services/main'
import env from '#start/env'

// Configuração do scheduler baseada no ambiente
const isDevelopment = env.get('NODE_ENV') === 'development'
const cronExpression = isDevelopment ? '*/10 * * * * *' : '0 */16 * * *' // 10 segundos em dev, 16 horas em prod

// Agendador para processar tarefas recorrentes
scheduler.command('process:recurring-tasks').cron(cronExpression).withoutOverlapping() // Previne que a tarefa rode novamente se a anterior ainda estiver em execução
