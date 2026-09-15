type Listeners<TEvents> = {
  [K in keyof TEvents]?: Array<(payload: TEvents[K]) => void>;
};

class EventEmitter<TEvents> {
  private events: Listeners<TEvents> = {}

  on<K extends keyof TEvents>(event: K, payload: (payloadEvent: TEvents[K]) => void): void {
    if (!this.events[event]) {
      this.events[event] = []
    }

    this.events[event].push(payload)
  }

  once<K extends keyof TEvents>(event: K, payload: (payloadEvent: TEvents[K]) => void): void {
    if (!this.events[event]) {
      this.events[event] = []
    }

    this.events[event] = [payload]
  }

  off<K extends keyof TEvents>(event: K, payload: (payloadEvent: TEvents[K]) => void): void {
    const listeners = this.events[event]

    if (listeners?.includes(payload)) {
      const indexToRemove = listeners?.indexOf(payload)
      if (indexToRemove !== -1) {
        listeners?.splice(indexToRemove, 1);
      }
    }
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const listeners = this.events[event]

    listeners?.forEach(fn => {
      fn(payload)
    });
  }
}

export default EventEmitter;