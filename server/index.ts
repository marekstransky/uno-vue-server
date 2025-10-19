import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import type { Context as WsContext } from 'graphql-ws'
import { PubSub } from 'graphql-subscriptions'
import { schema } from './schema'
import type { GraphQLContext } from './context'
import { GameManager } from './game/gameManager'
import { UserRepository } from './data/userRepository'
import { SessionManager } from './auth/sessionManager'
import { buildHttpContext, buildWsContext } from './context'

async function bootstrap() {
  const app = express()
  const httpServer = createServer(app)

  const pubsub = new PubSub()
  const users = new UserRepository(process.cwd())
  await users.init()
  const sessions = new SessionManager()
  const games = new GameManager(pubsub, users)

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql'
  })

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx: WsContext) => buildWsContext({ ctx, games, users, sessions })
    },
    wsServer
  )

  const server = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose()
            }
          }
        }
      }
    ]
  })

  await server.start()

  app.use(cors({ origin: ['http://localhost:5173'], credentials: true }))
  app.use('/graphql', express.json(), expressMiddleware(server, {
    context: async ({ req }) => buildHttpContext({ req, games, users, sessions })
  }))

  const port = Number(process.env.PORT ?? 4000)
  await new Promise<void>(resolve => httpServer.listen({ port }, resolve))
  console.log(`🚀 GraphQL server ready at http://localhost:${port}/graphql`)
}

bootstrap().catch(error => {
  console.error('Failed to start server', error)
  process.exit(1)
})
