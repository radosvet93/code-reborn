type Listeners<TEvents> = {
  [K in keyof TEvents]?: {
    handler: (payload: TEvents[K]) => void
    once: boolean
  }[]
};

class EventEmitter<TEvents> {
  private events: Listeners<TEvents> = {}

  on<K extends keyof TEvents>(event: K, payload: (payloadEvent: TEvents[K]) => void): void {
    if (!this.events[event]) {
      this.events[event] = []
    }

    this.events[event].push({ handler: payload, once: false })
  }

  once<K extends keyof TEvents>(event: K, payload: (payloadEvent: TEvents[K]) => void): void {
    if (!this.events[event]) {
      this.events[event] = []
    }

    this.events[event].push({ handler: payload, once: true });
  }

  off<K extends keyof TEvents>(event: K, payload: (payloadEvent: TEvents[K]) => void): void {
    this.events[event] = this.events[event]?.filter(listener => listener.handler !== payload)

  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const listeners = [...(this.events[event] ?? [])]

    for (const fn of listeners) {
      fn.handler(payload)

      if (fn.once) {
        const listenerIdx = this.events[event]?.findIndex(
          listener => listener === fn
        ) ?? -1

        if (listenerIdx !== -1) {
          this.events[event]?.splice(listenerIdx, 1)
        }
      }
    }
  }
}

export default EventEmitter;