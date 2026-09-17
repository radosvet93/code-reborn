import { expect, test, vi } from 'vitest'
import EventEmitter from './EventEmitter'

type Events = {
  "order.created": {
    orderId: string;
  };

  "order.completed": {
    orderId: string;
    completedAt: Date;
  };

  "user.deleted": {
    userId: string;
  };
}

test('should emit event', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandler = vi.fn()
  emitter.on("order.created", mockHandler);
  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandler).toHaveBeenCalled()
  expect(mockHandler).toHaveBeenCalledWith({ orderId: '123' })
})

test('should emit multiple events', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandler1 = vi.fn()
  const mockHandler2 = vi.fn()
  emitter.on("order.created", mockHandler1);
  emitter.on("order.created", mockHandler2);
  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandler1).toHaveBeenCalled()
  expect(mockHandler1).toHaveBeenCalledWith({ orderId: '123' })
  expect(mockHandler2).toHaveBeenCalled()
  expect(mockHandler2).toHaveBeenCalledWith({ orderId: '123' })
})

test('should emit just one event if the other is unregistered', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandler1 = vi.fn()
  const mockHandler2 = vi.fn()
  emitter.on("order.created", mockHandler1);
  emitter.on("order.created", mockHandler2);
  emitter.off("order.created", mockHandler2);
  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandler1).toHaveBeenCalled()
  expect(mockHandler1).toHaveBeenCalledWith({ orderId: '123' })
  expect(mockHandler2).not.toHaveBeenCalled()
})

test('should NOT emit event when the handler is off', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandler = vi.fn()
  emitter.on("order.created", mockHandler);
  emitter.off("order.created", mockHandler);
  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandler).not.toHaveBeenCalled()
})

test('should NOT emit event when there is no emit', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandler = vi.fn()
  emitter.on("order.created", mockHandler);

  expect(mockHandler).not.toHaveBeenCalled()
})

test('should do nothing when unregistering a handler that is not registered', () => {
  const emitter = new EventEmitter<Events>();

  const registeredHandler = vi.fn()
  const unregisteredHandler = vi.fn()

  emitter.on("order.created", registeredHandler);
  emitter.off("order.created", unregisteredHandler);

  emitter.emit('order.created', { orderId: '123' })

  expect(registeredHandler).toHaveBeenCalledWith({ orderId: '123' })
})

test('should emit just multiple times for multiple registrations of the same handler', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandler = vi.fn()

  emitter.on("order.created", mockHandler);
  emitter.on("order.created", mockHandler);

  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandler).toHaveBeenCalledTimes(2)
  expect(mockHandler).toHaveBeenCalledWith({ orderId: '123' })
})

test('should emit twice for multiple registrations of the same handler', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandler = vi.fn()

  emitter.once("order.created", mockHandler);
  emitter.once("order.created", mockHandler);

  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandler).toHaveBeenCalledTimes(2)
  expect(mockHandler).toHaveBeenCalledWith({ orderId: '123' })
})

test('should emit just once for multiple registrations of the same handler (last registering method is important)', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandler = vi.fn()

  emitter.once("order.created", mockHandler);
  emitter.on("order.created", mockHandler);

  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandler).toHaveBeenCalledTimes(2)
  expect(mockHandler).toHaveBeenCalledWith({ orderId: '123' })
})

test('should emit just once for multiple emits and one handler', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandler = vi.fn()

  emitter.once("order.created", mockHandler);

  emitter.emit('order.created', { orderId: '123' })
  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandler).toHaveBeenCalledOnce()
  expect(mockHandler).toHaveBeenCalledWith({ orderId: '123' })
})

test('should emit just once for multiple handlers and one emit', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandlerA = vi.fn()
  const mockHandlerB = vi.fn()
  const mockHandlerC = vi.fn()

  emitter.on("order.created", mockHandlerA);
  emitter.once("order.created", mockHandlerB);
  emitter.on("order.created", mockHandlerC);

  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandlerA).toHaveBeenCalledOnce()
  expect(mockHandlerA).toHaveBeenCalledWith({ orderId: '123' })
  expect(mockHandlerB).toHaveBeenCalledOnce()
  expect(mockHandlerB).toHaveBeenCalledWith({ orderId: '123' })
  expect(mockHandlerC).toHaveBeenCalledOnce()
  expect(mockHandlerC).toHaveBeenCalledWith({ orderId: '123' })
})

test('should emit just once for multiple handlers and one emit', () => {
  const emitter = new EventEmitter<Events>();

  const mockHandlerA = vi.fn()
  const mockHandlerB = vi.fn()

  emitter.once("order.created", mockHandlerA);
  emitter.once("order.created", mockHandlerB);

  emitter.emit('order.created', { orderId: '123' })

  expect(mockHandlerA).toHaveBeenCalledOnce()
  expect(mockHandlerA).toHaveBeenCalledWith({ orderId: '123' })
  expect(mockHandlerB).toHaveBeenCalledOnce()
  expect(mockHandlerB).toHaveBeenCalledWith({ orderId: '123' })
})

test('should emit the correct payload for different events', () => {
  const emitter = new EventEmitter<Events>();

  const createdHandler = vi.fn()
  const completedHandler = vi.fn()

  emitter.on("order.created", createdHandler)
  emitter.on("order.completed", completedHandler)

  const completedAt = new Date()

  emitter.emit("order.created", { orderId: "123" })
  emitter.emit("order.completed", {
    orderId: "456",
    completedAt
  })

  expect(createdHandler).toHaveBeenCalledWith({ orderId: "123" })
  expect(completedHandler).toHaveBeenCalledWith({
    orderId: "456",
    completedAt
  })
})