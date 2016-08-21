import { describe, it } from 'global'
import { expect, spy } from './__setup__'
import { run, Request, Response } from '../src/express-unit'

describe('run', () => {

  it('invokes a middleware', () => {
    const middleware = spy(function middleware() {})
    run(null, middleware)
    expect(middleware).to.have.been.called
  })

  it('calls a callback after invoking a middleware', done => {
    const middleware = spy(function middleware() {})
    run(null, middleware, () => {
      done()
    })
  })

  it('calls a setup function before running middleware', () => {
    const setup = spy(function setup(req, res) {
      req.headers['foo'] = 'bar'
      res.locals.id = 1
    })
    const middleware = spy(function middleware(req, res, next) {
      expect(req.get('foo')).to.equal('bar')
      expect(res.locals).to.have.property('id', 1)
      expect(next).to.be.a('function')
    })
    run(setup, middleware)
    expect(setup).to.have.been.calledBefore(middleware)
  })

  it('calls a setup function with a Request and Response', done => {
    const setup = (req, res) => {
      expect(req).to.be.an.instanceOf(Request)
      expect(req.app).to.be.an('object')
      expect(req.body).to.be.an('object')
      expect(req.cookies).to.be.an('object')
      expect(req.params).to.be.an('object')
      expect(req.query).to.be.an('object')
      expect(req.route).to.be.an('object')
      expect(req.signedCookies).to.be.an('object')
      expect(res).to.be.an.instanceOf(Response)
      expect(res.app).to.be.an('object')
      expect(res.locals).to.be.an('object')
      done()
    }
    run(setup, function middleware() {})
  })

  it('uses a custom next function returned from setup', done => {
    const next = spy()
    const setup = () => next
    const middleware = (req, res, next) => next()
    run(setup, middleware, (err, req, res, next) => {
      expect(next).to.have.been.called
      done()
    })
  })

  it('resolves an async middleware', async () => {
    const middleware = spy(() => Promise.resolve())
    const { err, req, res, next } = await run(null, middleware)
    expect(err).to.be.null
    expect(req).to.be.an.instanceOf(Request)
    expect(res).to.be.an.instanceOf(Response)
    expect(next).to.be.a('function')
  })

  it('resolves an async middleware and calls a callback', done => {
    const middleware = spy(() => Promise.resolve())
    run(null, middleware, (err, req, res, next) => {
      expect(err).to.be.null
      expect(req).to.be.an.instanceOf(Request)
      expect(res).to.be.an.instanceOf(Response)
      expect(next).to.be.a('function')
      done()
    })
  })

  it('captures the error passed to next', done => {
    const middleware = (req, res, next) => next(new Error('oops'))
    run(null, middleware, err => {
      expect(err).to.have.property('message', 'oops')
      done()
    })
  })

})
