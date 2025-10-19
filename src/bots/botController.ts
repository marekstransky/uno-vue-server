import type { BotIdentity, BotTurnDecision, TurnContext, UnoCheckRequest, UnoCheckResponse, BotOutboundMessage, BotInboundMessage } from './botMessages'

export class BotController {
  private worker: Worker
  private nextRequestId = 1
  private pending = new Map<number, { resolve: (value: any) => void; reject: (reason?: unknown) => void }>()
  private readyResolver!: () => void
  private readonly readyPromise: Promise<void>

  constructor(identity: BotIdentity) {
  this.worker = new Worker(new URL('../workers/bot.worker.ts', import.meta.url), { type: 'module' })
    this.readyPromise = new Promise(resolve => {
      this.readyResolver = resolve
    })
    this.worker.onmessage = event => this.handleMessage(event.data as BotOutboundMessage)
    this.worker.onerror = err => {
      for (const [id, pending] of this.pending) {
        pending.reject(err)
        this.pending.delete(id)
      }
    }
    this.worker.postMessage({ kind: 'init', identity } as BotInboundMessage)
  }

  terminate() {
    this.worker.terminate()
    this.pending.clear()
  }

  async takeTurn(context: Omit<TurnContext, 'requestId'>): Promise<BotTurnDecision['decision']> {
    await this.readyPromise
    return this.sendTurnRequest(context)
  }

  async considerUnoCall(context: Omit<UnoCheckRequest, 'requestId'>): Promise<UnoCheckResponse> {
    await this.readyPromise
    return this.sendUnoCheckRequest(context)
  }

  private sendTurnRequest(context: Omit<TurnContext, 'requestId'>) {
    const requestId = this.nextRequestId++
    const payload: BotInboundMessage = { kind: 'turn', context: { ...context, requestId } as TurnContext }

    const promise = new Promise<BotTurnDecision['decision']>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject })
    })

    this.worker.postMessage(payload)
    return promise
  }

  private sendUnoCheckRequest(context: Omit<UnoCheckRequest, 'requestId'>) {
    const requestId = this.nextRequestId++
    const payload: BotInboundMessage = { kind: 'uno-check', context: { ...context, requestId } as UnoCheckRequest }

    const promise = new Promise<UnoCheckResponse>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject })
    })

    this.worker.postMessage(payload)
    return promise
  }

  private handleMessage(message: BotOutboundMessage) {
    switch (message.kind) {
      case 'ready':
        this.readyResolver()
        break
      case 'decision': {
        const { requestId, decision } = message.payload
        const pending = this.pending.get(requestId)
        if (pending) {
          pending.resolve(decision)
          this.pending.delete(requestId)
        }
        break
      }
      case 'uno-check-result': {
        const { requestId, shouldCallOut } = message.payload
        const pending = this.pending.get(requestId)
        if (pending) {
          pending.resolve({ requestId, shouldCallOut } as UnoCheckResponse)
          this.pending.delete(requestId)
        }
        break
      }
    }
  }
}
