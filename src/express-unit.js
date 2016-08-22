import Error from 'es6-error'
import Promise from 'bluebird'
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
Request.prototype = request

export function Response() {
  this.app = {},
  this.locals = {}
}
Response.prototype = response

export function run(setup, middleware, done) {

  let err = null

  const req = new Request()
  const res = new Response()
  const next = (_err = null) => (err = _err)

  setup = setup || ((req, res, next) => next())

  let result

  setup(req, res, (_err = null) => {
    err = _err
    result = err
      ? middleware(err, req, res, next)
      : middleware(req, res, next)
  })

  return Promise
    .resolve(result)
    .then(() => {
      if (typeof done === 'function') return done(err, req, res)
      return [err, req, res]
    })
    .catch(err => {
      const message = 'unhandled rejection or assertion error'
      const error = new ExpressUnitError(err, message)
      return Promise.reject(error)
    })
}

export class ExpressUnitError extends Error {
  constructor(err, message) {
    super(message)
    this.err = JSON.stringify(err, null, 2)
  }
  toString() {
    return `${this.name}: ${this.message}\n${this.err}`
  }
}
