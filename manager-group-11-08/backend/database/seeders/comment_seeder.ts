import Comment from '#models/comment'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Task from '#models/task'

export default class CommentSeeder extends BaseSeeder {
  async run() {
    try {
      console.log('CommentSeeder: Iniciando execução.')
      // Buscar usuários
      console.log('CommentSeeder: Buscando usuários...')
      const developer = await User.findBy('email', 'dev@example.com')
      const designer = await User.findBy('email', 'designer@example.com')
      const manager = await User.findBy('email', 'gerente@example.com')

      if (developer) console.log('CommentSeeder: Desenvolvedor encontrado:', developer.id)
      else console.error('CommentSeeder: Desenvolvedor N��O encontrado (dev@example.com)')

      if (designer) console.log('CommentSeeder: Designer encontrado:', designer.id)
      else console.error('CommentSeeder: Designer NÃO encontrado (designer@example.com)')

      if (manager) console.log('CommentSeeder: Gerente encontrado:', manager.id)
      else console.error('CommentSeeder: Gerente NÃO encontrado (gerente@example.com)')

      if (!developer || !designer || !manager) {
        console.error(
          'CommentSeeder: Um ou mais usuários chave não foram encontrados. Abortando criação de comentários.'
        )
        return
      }

      // Buscar tarefas pelos títulos
      console.log('CommentSeeder: Buscando tarefas...')
      const configTask = await Task.findBy('title', 'Configurar ambiente de desenvolvimento')
      const apiTask = await Task.findBy('title', 'Desenvolver API RESTful')
      const wireframesTask = await Task.findBy('title', 'Criar wireframes')
      const designTask = await Task.findBy('title', 'Design de interface')

      if (configTask)
        console.log('CommentSeeder: configTask encontrada:', configTask.id, '-', configTask.title)
      else
        console.error(
          'CommentSeeder: Tarefa "Configurar ambiente de desenvolvimento" NÃO encontrada'
        )

      if (apiTask) console.log('CommentSeeder: apiTask encontrada:', apiTask.id, '-', apiTask.title)
      else console.error('CommentSeeder: Tarefa "Desenvolver API RESTful" NÃO encontrada')

      if (wireframesTask)
        console.log(
          'CommentSeeder: wireframesTask encontrada:',
          wireframesTask.id,
          '-',
          wireframesTask.title
        )
      else console.error('CommentSeeder: Tarefa "Criar wireframes" NÃO encontrada')

      if (designTask)
        console.log('CommentSeeder: designTask encontrada:', designTask.id, '-', designTask.title)
      else console.error('CommentSeeder: Tarefa "Design de interface" NÃO encontrada')

      // Verifica se todas as tarefas principais foram encontradas antes de prosseguir
      if (!configTask || !apiTask || !wireframesTask || !designTask) {
        console.error(
          'CommentSeeder: Uma ou mais tarefas chave não foram encontradas. Abortando criação de comentários.'
        )
        return
      }

      console.log('CommentSeeder: Criando comentários para as tarefas...')

      // Comentários para a Tarefa 1 (Configurar ambiente)
      if (configTask && developer) {
        console.log(
          `CommentSeeder: Tentando criar comentário 1 para configTask ID: ${configTask.id} por User ID: ${developer.id}`
        )
        try {
          const c1 = await Comment.create({
            content: 'Ambiente configurado com sucesso!',
            task_id: configTask.id,
            userId: developer.id,
          })
          console.log(
            `CommentSeeder: Comentário ID ${c1.id} ("Ambiente configurado com sucesso!") criado para configTask.`
          )
        } catch (e) {
          console.error('CommentSeeder: Erro ao criar comentário 1 para configTask:', e)
        }
      }

      let configTaskComment2: Comment | null = null
      if (configTask && manager) {
        console.log(
          `CommentSeeder: Tentando criar comentário 2 para configTask ID: ${configTask.id} por User ID: ${manager.id}`
        )
        try {
          configTaskComment2 = await Comment.create({
            content: 'Tudo funcionando conforme esperado.',
            task_id: configTask.id,
            userId: manager.id,
          })
          console.log(
            `CommentSeeder: Comentário ID ${configTaskComment2.id} ("Tudo funcionando conforme esperado.") criado para configTask.`
          )
        } catch (e) {
          console.error('CommentSeeder: Erro ao criar comentário 2 para configTask:', e)
        }
      }

      if (configTaskComment2 && developer && configTask) {
        console.log(
          `CommentSeeder: Tentando criar resposta para configTaskComment2 ID: ${configTaskComment2.id} por User ID: ${developer.id}`
        )
        try {
          const c3 = await Comment.create({
            content: 'Ótimo! Podemos prosseguir com a próxima fase então.',
            task_id: configTask.id, // Mant��m o task_id do comentário pai
            userId: developer.id,
            parentId: configTaskComment2.id,
          })
          console.log(
            `CommentSeeder: Resposta ID ${c3.id} ("Ótimo! Podemos prosseguir...") criada para configTaskComment2.`
          )
        } catch (e) {
          console.error('CommentSeeder: Erro ao criar resposta para configTaskComment2:', e)
        }
      } else if (!configTaskComment2) {
        console.error(
          'CommentSeeder: configTaskComment2 não foi criado ou encontrado, não foi possível criar resposta.'
        )
      }

      // Comentários para a Tarefa 2 (API RESTful)
      if (apiTask && developer) {
        console.log(
          `CommentSeeder: Tentando criar comentário 1 para apiTask ID: ${apiTask.id} por User ID: ${developer.id}`
        )
        try {
          const c4 = await Comment.create({
            content: 'Iniciando o desenvolvimento da API.',
            task_id: apiTask.id,
            userId: developer.id,
          })
          console.log(
            `CommentSeeder: Comentário ID ${c4.id} ("Iniciando o desenvolvimento da API.") criado para apiTask.`
          )
        } catch (e) {
          console.error('CommentSeeder: Erro ao criar comentário 1 para apiTask:', e)
        }

        console.log(
          `CommentSeeder: Tentando criar comentário 2 para apiTask ID: ${apiTask.id} por User ID: ${developer.id}`
        )
        let apiTaskComment2: Comment | null = null
        try {
          apiTaskComment2 = await Comment.create({
            content: 'Endpoints de usuários já estão funcionando.',
            task_id: apiTask.id,
            userId: developer.id,
          })
          console.log(
            `CommentSeeder: Comentário ID ${apiTaskComment2.id} ("Endpoints de usuários já estão funcionando.") criado para apiTask.`
          )
        } catch (e) {
          console.error('CommentSeeder: Erro ao criar comentário 2 para apiTask:', e)
        }

        if (apiTaskComment2 && manager) {
          console.log(
            `CommentSeeder: Tentando criar resposta 1 para apiTaskComment2 ID: ${apiTaskComment2.id} por User ID: ${manager.id}`
          )
          let apiTaskComment2ReplyByManager: Comment | null = null
          try {
            apiTaskComment2ReplyByManager = await Comment.create({
              content: 'Excelente! Quais foram os principais desafios?',
              task_id: apiTask.id, // Mantém o task_id do comentário pai
              userId: manager.id,
              parentId: apiTaskComment2.id,
            })
            console.log(
              `CommentSeeder: Resposta ID ${apiTaskComment2ReplyByManager.id} ("Excelente! Quais foram...") criada para apiTaskComment2.`
            )
          } catch (e) {
            console.error('CommentSeeder: Erro ao criar resposta 1 para apiTaskComment2:', e)
          }

          if (apiTaskComment2ReplyByManager && developer) {
            // Agora verificamos se a resposta do manager foi criada
            console.log(
              `CommentSeeder: Tentando criar resposta 2 para apiTaskComment2 ID: ${apiTaskComment2.id} (respondendo ao comentário original) por User ID: ${developer.id}`
            )
            try {
              const c7 = await Comment.create({
                content: 'Principalmente a integração com o sistema legado de autenticação.',
                task_id: apiTask.id,
                userId: developer.id,
                parentId: apiTaskComment2.id, // Resposta ao comentário original "Endpoints de usuários já estão funcionando."
              })
              console.log(
                `CommentSeeder: Resposta ID ${c7.id} ("Principalmente a integração...") criada para apiTaskComment2.`
              )
            } catch (e) {
              console.error('CommentSeeder: Erro ao criar resposta 2 para apiTaskComment2:', e)
            }
          } else if (!apiTaskComment2ReplyByManager) {
            console.error(
              `CommentSeeder: apiTaskComment2ReplyByManager não foi criado ou encontrado, não foi possível criar a segunda resposta.`
            )
          }
        } else if (!apiTaskComment2) {
          console.error(
            'CommentSeeder: apiTaskComment2 não foi criado ou encontrado, não foi possível criar respostas para ele.'
          )
        }
      }

      // Comentários para a Tarefa 4 (Wireframes)
      if (wireframesTask && designer) {
        console.log(
          `CommentSeeder: Tentando criar comentário para wireframesTask ID: ${wireframesTask.id} por User ID: ${designer.id}`
        )
        try {
          const c8 = await Comment.create({
            content: 'Wireframes aprovados pelo cliente.',
            task_id: wireframesTask.id,
            userId: designer.id,
          })
          console.log(
            `CommentSeeder: Comentário ID ${c8.id} ("Wireframes aprovados...") criado para wireframesTask.`
          )
        } catch (e) {
          console.error('CommentSeeder: Erro ao criar comentário para wireframesTask:', e)
        }
      }

      // Comentários para a Tarefa 5 (Design de interface)
      if (designTask && designer) {
        console.log(
          `CommentSeeder: Tentando criar comentário 1 para designTask ID: ${designTask.id} por User ID: ${designer.id}`
        )
        try {
          const c9 = await Comment.create({
            content: 'Iniciando o design das p��ginas principais.',
            task_id: designTask.id,
            userId: designer.id,
          })
          console.log(
            `CommentSeeder: Comentário ID ${c9.id} ("Iniciando o design...") criado para designTask.`
          )
        } catch (e) {
          console.error('CommentSeeder: Erro ao criar comentário 1 para designTask:', e)
        }
      }

      if (designTask && manager) {
        console.log(
          `CommentSeeder: Tentando criar comentário 2 para designTask ID: ${designTask.id} por User ID: ${manager.id}`
        )
        try {
          const c10 = await Comment.create({
            content: 'Por favor, use a paleta de cores aprovada.',
            task_id: designTask.id,
            userId: manager.id,
          })
          console.log(
            `CommentSeeder: Comentário ID ${c10.id} ("Por favor, use a paleta...") criado para designTask.`
          )
        } catch (e) {
          console.error('CommentSeeder: Erro ao criar comentário 2 para designTask:', e)
        }
      }

      console.log('CommentSeeder: Criação de comentários finalizada.')
    } catch (error) {
      console.error('CommentSeeder: Erro GERAL ao executar seeder de comentários:', error)
    }
  }
}
