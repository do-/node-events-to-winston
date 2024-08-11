![workflow](https://github.com/do-/node-events-to-winston/actions/workflows/main.yml/badge.svg)
![Jest coverage](./badges/coverage-jest%20coverage.svg)

`events-to-winston` is a module featuring the [`Tracker`](https://github.com/do-/node-events-to-winston/wiki/Tracker) class: a tool for observing an arbitrary [`EventEmitter`](https://nodejs.org/docs/latest/api/events.html) with a given [`winston`](https://github.com/winstonjs/winston) logger.

Each `Tracker` object listens to a given `emitter` and transforms incoming events to `winston`'s [_info objects_](https://github.com/winstonjs/winston?tab=readme-ov-file#streams-objectmode-and-info-objects), which are immediately fed to the specified `logger`.

One `logger` can be shared across multiple `Tracker` instances, but each of them must observe its own, unique `emitter`.

`Tracker` is designed to be completely configurable, with 3 the tiered setup (implemented via [subclassable-object-merger](https://github.com/do-/node-subclassable-object-merger)):
* unique options set at the instance creation;
* `emitter` specific defaults available as its special properties;
* the hardcoded common default settings.

This way, the `Tracker` class is presumed to be mostly used as is, without any modifications. While it's always possible to make a subclass, it worth considering to achieve the desired effect by modifying the configuration or by using log formatters.

# Installation
```sh
npm install events-to-winston
```

# Usage
```js
const {Tracker} = require ('events-to-winston')

// const logger = winston.createLogger (...)
// const myEventEmitter = new MyEventEmitterClass (...)

// myEventEmitter [Tracker.LOGGING_ID] = 1
// myEventEmitter [Tracker.LOGGING_PARENT] = someParentObject // with `Tracker.LOGGING_ID` set

const tracker = new Tracker (emitter, logger, {
//id: `process #${emitter.id}`, 
  events: {
    progress: {
      level: 'info',
//    message: 'progress', // by default, equals to the event name
//    elapsed: true,       // to set `info.elapsed`: ms since the `tracker` creation
  // properties may be computable, `this` is myEventEmitter
//    level:   function (payload) {return this.status == 10 && payload < 50 ? 'notice' : 'info'},
//    message: function (payload) {return `${this.id}: ${payload}%`},
//    details: function (payload) {return {id: this.id, progress: payload}},
    }
  }
//, maxPathLength: 100
//, sep: '/'
})

tracker.listen ()

// myEventEmitter.emit ('progress', 42)

// tracker.unlisten ()
```
# Info objects' properties, tracker settings
As previously stated, for each incoming event mentioned in the configuration, `Tracker` produces an _info object_ according to `winston`'s conventions. This section describes individual properties of these objects and, at the same time, eponymous tracker's options.

## `level`
This is the only mandatory property in the `event`'s configuration. If set as a `string`, it's copied into each info object as is. May be set as as function: in this case, it's called with the event's payload as the argument and the underlying event emitter as `this`.

## `message`
By default, is copied from the event name. Otherwise, is copied as is or evaluated as a function, like `level`.

## `details`
If configured, must be a function, called the same way as for `level` and `message`. Its result, set as `info.details` is presumed to be an object to be used with advanced formatters.

## `id`
If set, this global tracker option is copied into each info object. It's presumed to be some unique ID of the event emitter being observed.

## `elapsed`
If the `elapsed` option is set for the event, `info.elapsed` is the number of milliseconds since the tracker instance was created.

## `event`
This property is always set as the copy of the `event`'s name.

# Default configuration
A `Tracker` instance may be created without any configuration at all: with only `emitter` and `logger` parameters. In this case, the [`getDefaultEvents ()`](https://github.com/do-/node-events-to-winston/wiki/Tracker#getdefaultevents-) result will be used, that is
```
{
  error: {
    level: 'error', 
    message: error => error.stack, 
    details: error => error
  },
}
```
If the `events` option is set explicitly, but lacks any mention of `'error'`, the default configuration is silently added.

So, at least [`'error'` events](https://nodejs.org/docs/latest/api/events.html#error-events) are tracked anyway (which makes sense due to their special properties, like the ability to shut down the entire runtime).

The explicit redefinition, partial or complete, is always available.

# `emitter`'s own configuration
The `emitter` to be observed may not only supply events, but also declare which events are to be logged and how: by exposing the special property `[Tracker.LOGGING_EVENTS]` (its name is a Symbol available as a `Tracker` class' static member).

Example:
```js
class MyClass extends EventEmitter {
  get [Tracker.LOGGING_EVENTS] () {
    return {
      start:  {level: 'info'},
      finish: {level: 'info', elapsed: true},
    }
  }
}
```
So, when actually creating a `Tracker` instance, the configuration is merged from three sources:
* the 3rd constructor parameter (if any): highest priority;
* `emitter.[Tracker.LOGGING_EVENTS]`: filling gaps;
* finally the hardcoded default error handling (see the previous section), if left undefined.

# `id` auto discovery
While the tracker's `id` may be set explicitly as a constructor option, it can also be computed based on the observable `emitter`. To make it possible, the `emitter` may publish properties named:
* `[Tracker.LOGGING_ID]`: some scalar identifier value;
* `[Tracker.LOGGING_PARENT]`: the optional reference to a parent object.

If the `id` is not set, but `emitter [Tracker.LOGGING_ID]` is, the `Tracker` constructor goes through the `[Tracker.LOGGING_PARENT]` inheritance, constructs the `path` array, joins it with the `sep` option (`'/'` by default) and finally sets as `id`. 

Example:
```js
const service = {}
service [Tracker.LOGGING_ID] = 'mySvc'

const request = new EventEmitter ()
request [Tracker.LOGGING_PARENT] = service
request [Tracker.LOGGING_ID] = '8faa4e0e-d079-4c80-2200-a4a6fc702535'

const tracker = new Tracker (request, logger)
// tracker.id = 'mySvc/8faa4e0e-d079-4c80-2200-a4a6fc702535'
```

Instead of direct injection, classes using this `events-to-winston`'s feature should set the necessary properties in constructors or define accessor methods like

```js
class MyService {
  get [Tracker.LOGGING_ID] {
    return this.name
  }
}
class MyServiceRequest {
  get [Tracker.LOGGING_PARENT] {
    return this.service
  }
  get [Tracker.LOGGING_ID] {
    return this.uuid
  }
}
```
