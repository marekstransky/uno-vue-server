import { gql } from '@apollo/client/core'

export const CARD_FIELDS = gql`
  fragment CardFields on Card {
    type
    color
    number
  }
`

export const USER_STATS_FIELDS = gql`
  fragment UserStatsFields on UserStats {
    gamesPlayed
    gamesWon
    totalScore
  }
`

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    username
    createdAt
    stats {
      ...UserStatsFields
    }
  }
  ${USER_STATS_FIELDS}
`

export const AUTH_PAYLOAD_FIELDS = gql`
  fragment AuthPayloadFields on AuthPayload {
    token
    user {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`

export const PLAYER_STATE_FIELDS = gql`
  fragment PlayerStateFields on PlayerState {
    seat
    name
    cardCount
    score
    joinedAt
    saidUno
    isSelf
    isCurrentTurn
  }
`

export const ROUND_STATE_FIELDS = gql`
  fragment RoundStateFields on RoundState {
    currentPlayerSeat
    direction
    drawPileSize
    discardColor
    discardTop {
      ...CardFields
    }
    myHand {
      ...CardFields
    }
  }
  ${CARD_FIELDS}
`

export const GAME_STATE_FIELDS = gql`
  fragment GameStateFields on GameState {
    id
    code
    status
    seats
    cardsPerPlayer
    players {
      ...PlayerStateFields
    }
    round {
      ...RoundStateFields
    }
    events {
      id
      message
      createdAt
    }
    winnerSeat
    completedAt
  }
  ${PLAYER_STATE_FIELDS}
  ${ROUND_STATE_FIELDS}
`

export const PENDING_GAME_FIELDS = gql`
  fragment PendingGameFields on PendingGame {
    id
    code
    status
    seats
    cardsPerPlayer
    createdAt
    players {
      seat
      name
      joinedAt
      isSelf
    }
  }
`

export const PENDING_GAMES_QUERY = gql`
  query PendingGames($playerKey: ID) {
    pendingGames(playerKey: $playerKey) {
      ...PendingGameFields
    }
  }
  ${PENDING_GAME_FIELDS}
`

export const ME_QUERY = gql`
  query Me {
    me {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`

export const GAME_QUERY = gql`
  query Game($id: ID!, $playerKey: ID) {
    game(id: $id, playerKey: $playerKey) {
      ...GameStateFields
    }
  }
  ${GAME_STATE_FIELDS}
`

export const JOIN_PAYLOAD_FIELDS = gql`
  fragment JoinPayloadFields on JoinGamePayload {
    playerKey
    game {
      ...GameStateFields
    }
  }
  ${GAME_STATE_FIELDS}
`

export const CREATE_GAME_MUTATION = gql`
  mutation CreateGame($name: String!, $seats: Int!, $cardsPerPlayer: Int!) {
    createGame(name: $name, seats: $seats, cardsPerPlayer: $cardsPerPlayer) {
      ...JoinPayloadFields
    }
  }
  ${JOIN_PAYLOAD_FIELDS}
`

export const JOIN_GAME_MUTATION = gql`
  mutation JoinGame($gameId: ID!, $name: String!) {
    joinGame(gameId: $gameId, name: $name) {
      ...JoinPayloadFields
    }
  }
  ${JOIN_PAYLOAD_FIELDS}
`

export const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $password: String!) {
    register(username: $username, password: $password) {
      ...AuthPayloadFields
    }
  }
  ${AUTH_PAYLOAD_FIELDS}
`

export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      ...AuthPayloadFields
    }
  }
  ${AUTH_PAYLOAD_FIELDS}
`

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`

export const START_GAME_MUTATION = gql`
  mutation StartGame($gameId: ID!, $playerKey: ID!) {
    startGame(gameId: $gameId, playerKey: $playerKey) {
      ...GameStateFields
    }
  }
  ${GAME_STATE_FIELDS}
`

export const PLAY_CARD_MUTATION = gql`
  mutation PlayCard($gameId: ID!, $playerKey: ID!, $cardIndex: Int!, $color: String) {
    playCard(gameId: $gameId, playerKey: $playerKey, cardIndex: $cardIndex, color: $color) {
      ...GameStateFields
    }
  }
  ${GAME_STATE_FIELDS}
`

export const DRAW_CARD_MUTATION = gql`
  mutation DrawCard($gameId: ID!, $playerKey: ID!) {
    drawCard(gameId: $gameId, playerKey: $playerKey) {
      ...GameStateFields
    }
  }
  ${GAME_STATE_FIELDS}
`

export const SAY_UNO_MUTATION = gql`
  mutation SayUno($gameId: ID!, $playerKey: ID!) {
    sayUno(gameId: $gameId, playerKey: $playerKey) {
      ...GameStateFields
    }
  }
  ${GAME_STATE_FIELDS}
`

export const CATCH_UNO_MUTATION = gql`
  mutation CatchUno($gameId: ID!, $playerKey: ID!, $accusedSeat: Int!) {
    catchUno(gameId: $gameId, playerKey: $playerKey, accusedSeat: $accusedSeat) {
      ...GameStateFields
    }
  }
  ${GAME_STATE_FIELDS}
`

export const LEAVE_GAME_MUTATION = gql`
  mutation LeaveGame($gameId: ID!, $playerKey: ID!) {
    leaveGame(gameId: $gameId, playerKey: $playerKey)
  }
`

export const PENDING_GAMES_SUBSCRIPTION = gql`
  subscription PendingGames($playerKey: ID) {
    pendingGames(playerKey: $playerKey) {
      ...PendingGameFields
    }
  }
  ${PENDING_GAME_FIELDS}
`

export const GAME_UPDATES_SUBSCRIPTION = gql`
  subscription GameUpdates($gameId: ID!, $playerKey: ID) {
    gameUpdates(gameId: $gameId, playerKey: $playerKey) {
      ...GameStateFields
    }
  }
  ${GAME_STATE_FIELDS}
`
