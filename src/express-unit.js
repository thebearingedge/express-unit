import Error from 'es6-error'
import { request, response } from 'express'

const Request = () => ({
  __proto__: request,
  app: {},
  body: {},
  query: {},
  route: {},
  params: {},
  headers: {},
  cookies: {},
  signedCookies: {}
})

const Response = () => ({
  __proto__: response,
  app: {},
  locals: {}
})

const chainables = ['status', 'vary']

export async function run(setup, middleware, callback) {

  setup = setup || ((req, res, next) => next())

  const req = Request()
  const res = Response()

  let err = null
  let nextCalled = false

  const finish = (_err = null) => {
    err = _err
    nextCalled = true
    isFunction(callback) && callback(err, req, res)
  }

  for (let property in res) {
    if (isFunction(res[property])) {
      res[property] = () => chainables.includes(property) ? res : finish()
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

  try {
    await promise
    if (nextCalled || !isFunction(callback)) return [err, req, res]
    try {
      callback(err, req, res)
    }
    catch (err) {
      throw new ExpressUnitError(null, err)
    }
  }
  catch (err) {
    if (err instanceof ExpressUnitError) throw err.err
    throw new ExpressUnitError('Unhandled rejection in middleware', err)
  }
}

export class ExpressUnitError extends Error {
  constructor(message, err) {
    super(message)
    this.err = err
  }
  toString() {
    const { name, message, err } = this
    return `${name}: ${message}\n${JSON.stringify(err, null, 2)}`
  }
}

function isFunction(value) {
  return typeof value === 'function'
}

function isPromise(value) {
  return value && typeof value === 'object' && isFunction(value.then)
}
