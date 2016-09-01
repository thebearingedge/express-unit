import Error from 'es6-error'
import { request, response } from 'express'

export function Request() {
  this.app = {}
  this.body = {}
  this.query = {}
  this.route = {}
  this.params = {}
  this.headers = {}
  this.cookies = {}
  this.signedCookies = {}
}
Request.prototype = Object.create(request)

export function Response() {
  this.app = {},
  this.locals = {}
}
Response.prototype = Object.create(response)

export function run(setup, middleware, done) {

  setup = setup || ((req, res, next) => next())

  const req = new Request()
  const res = new Response()

  let err = null

  const finish = (_err = null) => {
    err = _err
    isFunction(done) && done(err, req, res)
  }

  for (let property in res) {
    if (isFunction(res[property])) {
      res[property] = () => finish()
    }
  }

  let promise

  setup(req, res, (_err = null) => {
    err = _err
    promise = middleware.length <= 3
      ? middleware(req, res, finish)
      : middleware(err, req, res, finish)
  })

  if (!isPromise(promise)) return

  return SpreadablePromise
    .resolve(promise)
    .then(() => {
      if (!isFunction(done)) return [err, req, res]
      try {
        done(err, req, res)
      }
      catch(err) {
        throw new ExpressUnitError(null, err)
      }
    })
    .catch(err => {
      if (err instanceof ExpressUnitError) throw err.err
      throw new ExpressUnitError('Unhandled rejection in middleware', err)
    })
}

export class ExpressUnitError extends Error {
  constructor(message, err) {
    super(message)
    this.err = err
  }
  toString() {
    return `${this.name}: ${this.message}\n${JSON.stringify(this.err, null, 2)}`
  }
}

class SpreadablePromise extends Promise {
  spread(fn) {
    return this.then(arr => fn(...arr))
  }
}

function isFunction(obj) {
  return typeof obj === 'function'
}

function isPromise(obj) {
  return obj && typeof obj === 'object' && isFunction(obj.then)
}
