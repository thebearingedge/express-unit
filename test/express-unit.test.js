import { describe, it } from 'global'
import wrap from 'express-async-wrap'
import { expect, spy, stub, AssertionError } from './__setup__'
import { run, Request, Response, ExpressUnitError } from '../src/express-unit'

describe('run', () => {

  it('invokes a middleware', () => {
    const middleware = spy(function middleware() {})
    run(null, middleware)
    expect(middleware).to.have.been.called
  })

  it('calls a setup function before running middleware', () => {
    const setup = spy(function setup(req, res, next) {
      req.headers['foo'] = 'bar'
      res.locals.id = 1
      next()
    })
    const middleware = spy(function middleware(req, res, next) {
      expect(req.get('foo')).to.equal('bar')
      expect(res.locals).to.have.property('id', 1)
      expect(next).to.be.a('function')
    })
    run(setup, middleware)
    expect(setup).to.have.been.calledBefore(middleware)
  })

  it('calls a callback after invoking a middleware', done => {
    const setup = (req, res, next) => {
      stub(res, 'send')
      next()
    }
    const middleware = (req, res) => res.send('hola!')
    run(setup, middleware, (err, req, res) => {
      expect(res.send).to.have.been.calledWith('hola!')
      done()
    })
  })

  it('calls a setup function with a req, res, and next', done => {
    const setup = (req, res, next) => {
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
      expect(next).to.be.a('function')
      next()
    }
    run(setup, function middleware() {}, done)
  })

  it('captures the error passed to next', done => {
    const middleware = (req, res, next) => next(new Error('oops'))
    run(null, middleware, err => {
      expect(err).to.have.property('message', 'oops')
      done()
    })
  })

  it('supports error handlers', done => {
    const setup = (req, res, next) => next(new Error('oops'))
    // eslint-disable-next-line no-unused-vars
    const middleware = (err, req, res, next) => {
      expect(err).to.have.property('message', 'oops')
      next()
    }
    run(setup, middleware, done)
  })

  it('supports async middleware', async () => {
    const middleware = wrap(async (req, res, next) => await next())
    await run(null, middleware, (err, req, res) => {
      expect(err).to.be.null
      expect(req).to.be.an.instanceOf(Request)
      expect(res).to.be.an.instanceOf(Response)
    })
  })

  it('supports spread on async middleware', () => {
    const middleware = wrap(async (req, res, next) => await next())
    return run(null, middleware)
      .spread((err, req, res) => {
        expect(err).to.be.null
        expect(req).to.be.an.instanceOf(Request)
        expect(res).to.be.an.instanceOf(Response)
      })
  })

  it('rejects async middlware that does not handle errors', async () => {
    const middleware = () => Promise.reject(new Error('oops'))
    const err = await run(null, middleware).catch(err => err)
    expect(err).to.be.an.instanceOf(ExpressUnitError)
    expect(err.toString()).to.include('unhandled rejection')
  })

  it('forwards assertion errors made in the callback', () => {
    const middleware = function middleware() {}
    try {
      run(null, middleware, err => expect(err).to.exist)
    }
    catch (err) {
      expect(err).not.to.be.an.instanceOf(ExpressUnitError)
      expect(err).to.be.an.instanceOf(AssertionError)
    }
  })

  it('forwards assertion errors in the callback to async middleware', done => {
    const middleware = () => Promise.resolve()
    run(null, middleware, err => expect(err).to.exist)
      .catch(err => {
        expect(err).to.be.an.instanceOf(AssertionError)
        done()
      })
  })

})
