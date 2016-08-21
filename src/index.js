import isPromise from 'is-promise'
import isFunction from 'is-function'
import { request, response } from 'express'

export function Request() {
  Object.assign(this, {
    app: {},
    body: {},
    query: {},
    route: {},
    params: {},
    headers: {},
    cookies: {},
    signedCookies: {}
  })
}
Request.prototype = request

export function Response() {
  Object.assign(this, {
    app: {},
    locals: {}
  })
}
Response.prototype = response

export const run = (setup, middleware, done) => {

  let err = null
  const noop = () => {}

  setup = setup || noop

  const req = new Request()
  const res = new Response()
  const next = setup(req, res) || noop
  const onNext = ((_err = null) => {
    err = _err
    next(err)
  })
  const result = middleware(req, res, onNext)

  if (!isPromise(result) && !isFunction(done)) return
  if (!isPromise(result) && isFunction(done)) {
    return done(err, req, res, next)
  }
  if (isPromise(result) && isFunction(done)) {
    return result.then(() => done(err, req, res, next))
  }

  return result.then(() => ({ err, req, res, next }))
}
