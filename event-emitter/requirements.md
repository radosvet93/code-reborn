# Project 1: Type-Safe Event Emitter

## Objective

Build a small, type-safe event emitter library in TypeScript.

The goal of this project is to practise implementing a non-trivial abstraction from scratch without relying on AI-generated code.

The implementation should be understandable, predictable, well-tested, and strongly typed.

---

## Constraints

### Allowed

* TypeScript
* Node.js
* Your code editor
* Official TypeScript/Node.js documentation
* A test framework
* Searching documentation for API behaviour or syntax

### Not allowed

* ChatGPT
* Claude
* GitHub Copilot
* Cursor AI
* AI coding agents
* Copying an existing EventEmitter implementation
* Searching for or adapting complete implementations of this exercise

You may search for documentation, but the implementation must be your own.

---

# Functional Requirements

## 1. Create an EventEmitter

The library must expose an `EventEmitter` class.

Example:

```ts
const emitter = new EventEmitter<Events>();
```

The emitter must be generic and accept an event map defining the available events and their payloads.

Example:

```ts
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
};
```

---

## 2. Register event listeners

The emitter must provide an `on` method.

Example:

```ts
emitter.on("order.created", (event) => {
  console.log(event.orderId);
});
```

Requirements:

* A listener can be registered for an event.
* Multiple listeners can be registered for the same event.
* Listeners must receive the payload associated with their event.
* The event name must be restricted to events defined in the event map.
* The listener payload must be correctly inferred by TypeScript.

---

## 3. Remove event listeners

The emitter must provide an `off` method.

Example:

```ts
const handler = (event: Events["order.created"]) => {
  console.log(event.orderId);
};

emitter.on("order.created", handler);
emitter.off("order.created", handler);
```

Requirements:

* `off` must remove the specified listener.
* Removing a listener must not remove other listeners registered for the same event.
* Calling `off` for a listener that is not registered must not cause an error.
* The event and listener must be correctly typed.

---

## 4. Emit events

The emitter must provide an `emit` method.

Example:

```ts
emitter.emit("order.created", {
  orderId: "123",
});
```

Requirements:

* All registered listeners for the event must be invoked.
* Listeners must receive the emitted payload.
* The payload must be correctly typed according to the event.
* An event that has no registered listeners must be safe to emit.
* The emitter must not allow an invalid event name at compile time.
* The emitter must not allow an invalid payload at compile time.

For example, this should fail TypeScript type checking:

```ts
emitter.emit("order.created", {
  userId: "123",
});
```

---

## 5. Register one-time listeners

The emitter must provide a `once` method.

Example:

```ts
emitter.once("order.created", (event) => {
  console.log(event.orderId);
});
```

Requirements:

* The listener must be invoked at most once.
* Subsequent emissions of the same event must not invoke the listener again.
* `once` must receive the same type-safety guarantees as `on`.
* A one-time listener must be removable using `off` where reasonably possible.

---

# Type Safety Requirements

TypeScript must provide strong type inference throughout the public API.

Given:

```ts
type Events = {
  "order.created": {
    orderId: string;
  };

  "order.completed": {
    orderId: string;
    completedAt: Date;
  };
};
```

This should correctly infer the payload:

```ts
emitter.on("order.completed", (event) => {
  event.orderId;
  event.completedAt;
});
```

The following should produce TypeScript errors:

```ts
emitter.on("unknown.event", () => {});
```

```ts
emitter.emit("order.created", {
  userId: "123",
});
```

```ts
emitter.emit("order.created", {
  orderId: 123,
});
```

Avoid `any` in the public API.

If `any` is required internally, document why it is necessary and minimise its use.

---

# Behavioural Requirements

You must make explicit decisions about the following behaviours.

Document your decisions in the README.

## Duplicate listeners

Decide what should happen when:

```ts
emitter.on("order.created", handler);
emitter.on("order.created", handler);
```

Possible approaches include:

* Register the handler twice.
* Register it only once.

Choose one and document it.

---

## Removing an unknown listener

Decide what should happen when:

```ts
emitter.off("order.created", handler);
```

where `handler` has not been registered.

The operation should be safe.

Document the chosen behaviour.

---

## Listener errors

Decide what should happen when a listener throws:

```ts
emitter.on("order.created", () => {
  throw new Error("Something went wrong");
});
```

Consider:

* Should the error propagate?
* Should other listeners still execute?
* Should the emitter catch the error?

Choose a behaviour and document your reasoning.

---

## Listener mutation during emission

Consider:

```ts
emitter.on("order.created", firstHandler);
emitter.on("order.created", secondHandler);

function firstHandler() {
  emitter.off("order.created", secondHandler);
}
```

Decide whether `secondHandler` should still execute during the current `emit`.

Document the chosen behaviour.

You should also consider what happens when a listener registers another listener during emission.

---

## `once` and `off`

Consider:

```ts
emitter.once("order.created", handler);
emitter.off("order.created", handler);
```

Decide whether this should successfully remove the one-time listener.

Document your approach.

---

# Testing Requirements

Write automated tests covering the public behaviour.

At minimum, tests must cover:

### Registration

* Register a listener.
* Register multiple listeners for one event.
* Register listeners for different events.

### Emission

* Emit an event.
* Verify the listener receives the correct payload.
* Verify all relevant listeners are invoked.
* Emit an event with no listeners.

### Removal

* Remove a listener.
* Verify the removed listener is not invoked.
* Verify other listeners remain registered.
* Remove a listener that was never registered.

### Once

* Register a `once` listener.
* Emit the event multiple times.
* Verify it executes only once.

### Type safety

Include compile-time type checks where your chosen testing setup supports them.

At minimum, manually verify that invalid event names and payloads fail TypeScript compilation.

### Edge cases

Tests should cover the behavioural decisions you documented in the README.

---

# Code Quality Requirements

The implementation should:

* Use strict TypeScript.
* Have a small and clear public API.
* Avoid unnecessary dependencies.
* Avoid unnecessary abstractions.
* Avoid premature optimisation.
* Avoid `any` where reasonably possible.
* Keep implementation details private.
* Have meaningful names.
* Have tests that describe behaviour rather than implementation details.

Do not optimise for the smallest number of lines.

Optimise for clarity and correctness.

---

# Project Structure

A suggested structure is:

```text
event-emitter/
├── src/
│   ├── EventEmitter.ts
│   └── index.ts
├── test/
│   └── EventEmitter.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

You may use a different structure if you have a good reason.

---

# README Requirements

The README must contain:

## 1. Overview

Briefly explain what the project is.

## 2. API

Document:

* `EventEmitter`
* `on`
* `off`
* `once`
* `emit`

Include examples.

## 3. Design decisions

Explain your decisions regarding:

* Duplicate listeners
* Removing unknown listeners
* Listener errors
* Listener mutation during emission
* `once` + `off`

## 4. Testing

Explain how to run the tests.

## 5. Trade-offs

Briefly explain any important implementation trade-offs you made.

---

# Definition of Done

The project is complete when:

* [ ] `EventEmitter` is implemented from scratch.
* [ ] `on` works.
* [ ] `off` works.
* [ ] `emit` works.
* [ ] `once` works.
* [ ] Multiple listeners work.
* [ ] Listener removal works.
* [ ] Event names are type-safe.
* [ ] Event payloads are type-safe.
* [ ] TypeScript runs in strict mode.
* [ ] Automated tests cover the required behaviour.
* [ ] Edge cases are tested.
* [ ] README documents the public API.
* [ ] README documents behavioural decisions.
* [ ] README documents important trade-offs.
* [ ] No AI-generated implementation was used.

---

# Time Limit

Target implementation time:

**45–60 minutes**

Do not spend excessive time on tooling or project configuration.

The purpose of this exercise is the implementation and the engineering decisions behind it.

If you get stuck, write down what you are unsure about and continue where possible.

Do not look up a complete implementation.

---

# Final Review

Once complete, submit:

1. The `EventEmitter` implementation.
2. The tests.
3. The README.
4. Any notes about decisions or areas you found difficult.

The implementation will then be reviewed for:

* Correctness
* TypeScript design
* Type inference
* Runtime behaviour
* Edge cases
* API design
* Test quality
* Maintainability
* Complexity
* Engineering judgement
