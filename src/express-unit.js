import isPromise from 'is-promise'
import isFunction from 'is-function'
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

export const run = (setup, middleware, done) => {
  let err = null
  setup = setup || (() => {})
  const req = new Request()
  const res = new Response()
  const next = setup(req, res) || (() => {})
  const onNext = ((_err = null) => {
    err = _err
    next(err)
  })
  const result = middleware(req, res, onNext)

  if (!isPromise(result)) {
    if (!isFunction(done)) return
    return done(err, req, res, next)
  }

  return result.then(() => {
    return isFunction(done)
      ? done(err, req, res, next)
      : { err, req, res, next }
  })
}
