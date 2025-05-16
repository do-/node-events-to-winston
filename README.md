![workflow](https://github.com/do-/node-events-to-winston/actions/workflows/main.yml/badge.svg)
![Jest coverage](./badges/coverage-jest%20coverage.svg)

`events-to-winston` is a node.js library for writing comprehensive logs like this
```
2025-05-04 18:29:23.416 def/e36e8968 > App.doInit {"request":{"type":"app","action":"init"}}
2025-05-04 18:29:23.418 def/e36e8968 < 4 ms
2025-05-04 18:29:24.012 sch/a470d45f > App.doTick {"request":{"type":"app","action":"tick"}}
2025-05-04 18:29:24.014 sch/a470d45f/80b72428 > Message.doSend {"request":{"type":"message","action":"send","id":"a470d45f"}}
2025-05-04 18:29:24.014 sch/a470d45f/80b72428 < 1 ms
2025-05-04 18:29:24.014 sch/a470d45f < 5 ms
```
mostly automatically.

# Motivation

Suppose you develop a node.js application:
* with lots of [`EventEmitter`](https://nodejs.org/docs/latest/api/events.html)s 
* using [`winston`](https://github.com/winstonjs/winston) for logging.

Months after the code is frozen and deployed on a production environment, you have to quickly answer questions like
* why did that operation slow down?
* at that precise moment, what was the cause of the crash?
* why does that screen show X while Y is expected?

You probably want all necessary logging to be done by event listeners in and of itself, instead of random manually coded `logger.log (...)` calls. A configurable class for such listeners is provided by `events-to-winston`, with the addition of some suitable formatters.

## IDs, Nesting

When you deal with business process lifecycles, having [unique identifiers](#id) is crucial to analyze the history of related events: match error messages with previously reported parameter values etc.

The present module provides an easy way to [discover](#id-auto-discovery) such markers from the observable object's properties. And it's trivial to not only read local properties but to walk up the object hierarchy to build logging IDs as meaningful object paths like `${endpoint.id}/${httpRequest.id}/${sqlStatement.id}`.

## Exposing Business Data

Automatic event recording is great, but has little meaning without showing what exactly these events are about. For an AJAX request, you want the path and the body, for a database call — the SQL text and parameter values, and so on. All [`details`](#details) like this are easily configured to appear in _info objects_.

They are available to use with ['printf'](https://github.com/winstonjs/logform?tab=readme-ov-file#printf) or likes, but here come some pesky problems:
* it's obvious to print it as JSON, but [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) may throw errors;
* text values happen to be megabytes long — and, unlike short IDs, they are barely valuable for analysis;
  * verbatim copies of SOAP messages etc. must be stored elsewhere;
* `Buffers`'s [`toJSON ()`](https://nodejs.org/docs/latest/api/buffer.html#buftojson) output is lossless, but lengthy and hardly readable while binary data make little to no sense for the task at hand;
* dumps of [streams](https://nodejs.org/docs/latest/api/stream.html) and other system internals make reading logs even more difficult;
* some short, but [sensitive](https://github.com/cabinjs/sensitive-fields/blob/master/index.json) strings (e.g. passwords) must be never recorded at all.

To better cope with these annoyances, a special [formatter](https://github.com/do-/node-events-to-winston/wiki/formatDetails) is provided.

## Tagging Process Phases

When looking at a running flow of lines depicting some processes' events, you may prefer to clearly see which ones are about starting and finishing workflow instances. For sure, it can be deduced from content, but this module proposes a simple tool making human eyes and brains a bit more comfortable by showing _sigils_: easy remarkable one character tags corresponding to generalized process [phases](https://github.com/do-/node-events-to-winston/wiki/formatPhase): `>` at the beginning, `<` at the end and so on.

## Profiling

The native `winston`'s `logform` features the [`ms()`](https://github.com/winstonjs/logform/blob/master/ms.js) format showing the _number of milliseconds <u>since the previous</u> log message_ which appears to be not much useable: when you do some profiling, random error and debug messages can mess up stats easily.

To address this issue, `events-to-winston` lets developers augment any finite life `EventEmitter` (e.g. an HTTP request) with a one shot [observer object](#in-depth) keeping, among other, the moment of its creation and able to calculate [`elapsed`](#elapsed) times for necessary events. The corresponding [formatter](https://github.com/do-/node-events-to-winston/wiki/formatElapsed) is included in the package.

# Installation
```sh
npm install events-to-winston
```

# Usage
```js
const winston = require ('winston')
const {Tracker, formatDetails, formatElapsed, formatPhase} = require ('events-to-winston')

const logger = winston.createLogger (transports: [
  new transports.Console ({
    format: winston.format.combine (
      winston.format.timestamp ({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
      formatElapsed (),
      formatPhase (),
      formatDetails (),
      winston.format.printf (info => `${info.timestamp} ${info.id} ${info.message}`)
    )
  }),
])
// const myEventEmitter = new MyEventEmitterClass (...)

// myEventEmitter [Tracker.LOGGING_ID] = 1
// myEventEmitter [Tracker.LOGGING_PARENT] = someParentObject // with `Tracker.LOGGING_ID` set

const tracker = new Tracker (emitter, logger, {
//id: `process #${emitter.id}`, 
  events: {
    progress: {
      level: 'info',
//    message: 'progress', // defaults to the event name
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

# In Depth

`events-to-winston` features the [`Tracker`](https://github.com/do-/node-events-to-winston/wiki/Tracker) class: a tool for observing an arbitrary [`EventEmitter`](https://nodejs.org/docs/latest/api/events.html) with a given [`winston`](https://github.com/winstonjs/winston) logger.

Each `Tracker` object listens to a given `emitter` and transforms incoming events to `winston`'s [_info objects_](https://github.com/winstonjs/winston?tab=readme-ov-file#streams-objectmode-and-info-objects), which are immediately fed to the specified `logger`.

One `logger` can be shared across multiple `Tracker` instances, but each of them must observe its own, unique `emitter`.

`Tracker` is designed to be completely configurable, with 3 the tiered setup (implemented via [subclassable-object-merger](https://github.com/do-/node-subclassable-object-merger)):
* unique options set at the instance creation;
* `emitter` specific defaults available as its special properties;
* the hardcoded common default settings.

This way, the `Tracker` class is presumed to be mostly used as is, without any modifications. While it's always possible to make a subclass, it worth considering to achieve the desired effect by modifying the configuration or by using log formatters.

# Info objects' properties, tracker settings
As previously stated, for each incoming event mentioned in the configuration, `Tracker` produces an _info object_ according to `winston`'s conventions. This section describes individual properties of these objects and, at the same time, eponymous tracker's options.

## `winston`'s Standard

### `level`
This is the only mandatory property in the `event`'s configuration. If set as a `string`, it's copied into each info object as is. May be set as as function: in this case, it's called with the event's payload as the argument and the underlying event emitter as `this`.

### `message`
By default, is copied from the event name. Otherwise, is copied as is or evaluated as a function, like `level`.

## Extra

### `details`
If configured, must be a plain [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) or a function returning plain objects — the latter is called the same way as for `level` and `message`. Similar, but different from `winston`'s [`metadata`](https://github.com/winstonjs/logform?tab=readme-ov-file#metadata). [`formatDetails`](https://github.com/do-/node-events-to-winston/wiki/formatDetails) is recommended for serialization.

### `elapsed`
If the `elapsed` option is set for the event, `info.elapsed` is the number of milliseconds since the tracker instance was created. To generate `message` values based on the presence of this property, [`formatElapsed`](https://github.com/do-/node-events-to-winston/wiki/formatElapsed) is provided.

### `event`
This property is always set as the copy of the `event`'s name.

### `id`
If set, this global tracker option is copied into each info object. It's presumed to be some unique ID of the event emitter being observed. Think `winston`'s [`label`](https://github.com/winstonjs/logform?tab=readme-ov-file#label), but local for each observable instance.

### `isLast`
If this boolean option is configured, it's copied into the info object. If no event has this option set to `true`, then `info.isLast = true` when `elapsed` is set. That means, an event logged with the `elapsed` time should be the last in its lifecycle, but this can be overridden.

### `isFirst`
This property is set to `true` for the first info object created by a `Tracker` instance. Otherwise, absent. Not configurable.

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
  get [Tracker.LOGGING_ID] () {
    return this.name
  }
}
class MyServiceRequest {
  get [Tracker.LOGGING_PARENT] () {
    return this.service
  }
  get [Tracker.LOGGING_ID] () {
    return this.uuid
  }
}
```

# `details` declaration
Along with `info.id`, `info.details` is another [_meta_](https://github.com/winstonjs/winston?tab=readme-ov-file#streams-objectmode-and-info-objects) property that may be used to represent some `emitter` internals to be used in advanced formatters. Think query parameters for HTTP requests or parameter sets for SQL statement calls. And, as for the `id` field, emitters can publish the special property which content will appear in `info.details`:

```js
get [Tracker.LOGGING_DETAILS] () {
  return {
    const {parameters} = this
    return {...super [Tracker.LOGGING_DETAILS], parameters}
  }
}
```
Note that `info.details` is set only for events with the `details` option configured, at least as an empty object:
```js
events: {
  start: {
    level: 'info',
    details: {}              // emitter[Tracker.LOGGING_DETAILS] will be used 1st in Object.assign()...
  },
  notice: {
    level: 'info',
    details: ({where}) => ({               
      where,
      parameters: undefined, // ...and may be overridden as needed
    }),   
  },
  finish: {
    level: 'info',
    elapsed: true,           // here, no details at all
  },
}
```
