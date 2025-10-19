import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client/core'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { setContext } from '@apollo/client/link/context'
import { createClient } from 'graphql-ws'
import type { DocumentNode } from 'graphql'
import { AUTH_TOKEN_STORAGE_KEY } from '@/constants/storage'

const httpUri = import.meta.env.VITE_GRAPHQL_HTTP ?? 'http://localhost:4000/graphql'
const wsUri = import.meta.env.VITE_GRAPHQL_WS ?? 'ws://localhost:4000/graphql'

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  } catch (error) {
    console.warn('Unable to access localStorage for auth token', error)
    return null
  }
}

const httpLink = new HttpLink({ uri: httpUri })

const authLink = setContext((_, { headers }) => {
  const token = getAuthToken()
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ''
    }
  }
})

const authedHttpLink = authLink.concat(httpLink)

const wsClient = createClient({
  url: wsUri,
  lazy: true,
  connectionParams: () => {
    const token = getAuthToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
})

const wsLink = new GraphQLWsLink(wsClient)

const splitLink = split(
  ({ query }: { query: DocumentNode }) => {
    const definition = getMainDefinition(query)
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
  },
  wsLink,
  authedHttpLink
)

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  connectToDevTools: true
})
