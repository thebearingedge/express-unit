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

  let err = null

  const req = new Request()
  const res = new Response()
  const next = (_err = null) => (err = _err)

  setup = setup || ((req, res, next) => next())

  let promise

  setup(req, res, (_err = null) => {

    err = _err

    const result = middleware.length <= 3
      ? middleware(req, res, next)
      : middleware(err, req, res, next)

    if (!isPromise(result)) {
      return isFunction(done)
        ? done(err, req, res)
        : undefined
    }

    promise = SpreadablePromise
      .resolve(result)
      .then(() => {
        if (!isFunction(done)) return [err, req, res]
        try {
          done(err, req, res)
        }
        catch (err) {
          return Promise.reject(new ExpressUnitError(err))
        }
      })
      .catch(err => {
        if (err instanceof ExpressUnitError) {
          return Promise.reject(err.err)
        }
        const message = 'unhandled rejection in middleware'
        const error = new ExpressUnitError(err, message)
        return Promise.reject(error)
      })
  })

  return promise
}

export class ExpressUnitError extends Error {
  constructor(err, message) {
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
