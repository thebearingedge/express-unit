Express Unit
--
Express middleware testing made easy.

[![Build Status](https://travis-ci.org/thebearingedge/express-unit.svg?branch=master)](https://travis-ci.org/thebearingedge/express-unit.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/thebearingedge/express-unit/badge.svg?branch=master)](https://coveralls.io/github/thebearingedge/express-unit?branch=master)

`λ npm install express-unit`

### Contents
 - [Motivation](#motivation)
 - [Usage](#usage)
   + [Setup](#setup)
   + [Callbacks](#callbacks)
   + [Async](#async)

---

### Motivation
Express Unit puts the "unit" back in [unit testing](https://en.wikipedia.org/wiki/Unit_testing) for Express.js apps. It's a small, simple helper for exercising individual middlewares in isolation. Most testing tutorials and examples for `express` apps will utilize `supertest` (or similar).

```js
import request from 'supertest'
import app from '../app'

describe('app', () => {
  describe('/hello-test', () => {
    it('handles GET requests', done => {
      request(app)
        .get('/hello-test')
        .set('Accept', 'application/json')
        .expect(200, (err, res) => {
          /* make more assertions */
          done()
        })
    })
  })
})
```

This is great for testing your entire `app` or a given `router` within your `app`. But this is [integration testing](https://en.wikipedia.org/wiki/Integration_testing). The more complex a code path becomes, the more brittle tests become. Units only have one reason to change. For some endpoints, various checks are put in place to determine the response, e.g. confirming a user's identity, verifying their access rights, or bailing out of a request early if preconditions are not met. A single route could employ a middleware stack like this:

```js
router
  .use(authorize)
  .route('/users/:userId/permissions')
  .put(checkUserPermissions('admin'), updateUserPermissions(users))

router
  .use(errorHandler(logger))
```

There are 4 different middlewares involved in this single route. At least one of which needs access to some kind of data store. But each middleware is very focused and can be reused or replaced (Yay!).

---

### Usage
`run(setup, middleware[, callback])`

That's it!

Express Unit is a helper function for running a single middleware. To use, just `import` it and pass it a `setup` function, your `middleware`, and an optional callback.

```js
import run from 'express-unit'
import { expect, spy, stub } from './test-utils'
import myMiddleware from './my-middleware'

describe('myMiddleware', () => {
  it('gets called!', () => {
    const setup = spy()
    const middleware = spy(myMiddleware)
    run(setup, middleware)
    expect(setup).to.have.been.calledBefore(middleware)
  })
})
```

#### Setup
Your setup function will be called with a `req`, `res`, and `next` to prepare the request lifecycle for your middleware. This is your opportunity to stub out any relevant methods on `req` or `res`. Call `next` to execute your middleware.

If for some reason you don't want to supply a setup, just pass `null`.

`run(null, middleware[, callback])`

```js
// middleware.js
export default function middleware(req, res, next) {
  const token = req.get('x-access-token')
  if (!token) {
    const err = new Error('where is your token?')
    return next(err)
  }
  next()
}
```

```js
// middleware.spec.js
describe('middleware', () => {
  context('when the request has a token header', () => {
    const setup = (req, res, next) => {
      req.headers['x-access-token'] = 'myToken'
      next()
    }
    it('calls next without error', done => {
      run(setup, middleware, done)
    })
  })
})
```

The whole test is very small and doesn't rely on a full `app` or `router`.

#### Callbacks
Express Unit supports callbacks. Pass a callback as the third argument to inspect the results.

```js
// middleware.js
export default function middleware(req, res, next) {
  const token = req.get('x-access-token')
  if (!token) {
    const err = new Error('get outta here!')
    return next(err)
  }
  res.send('you are a nice person')
}
```

```js
// middleware.spec.js
describe('middleware', () => {
  context('when the request has a token header', () => {
    const setup = (req, res, next) => {
      req.headers['x-access-token'] = 'myToken'
      stub(res, 'send')
      next()
    }
    it('sends a compliment', done => {
      run(setup, middleware, (err, req, res) => {
        expect(err).to.be.null
        expect(res.send).to.have.been.calledWith('you are a nice person')
        done()
      })
    })
  })
})
```

#### Async
Express Unit also supports `async` middleware. If you totally hate callbacks, use `spread` on the Bluebird promise returned by `run`. Otherwise, you can still pass a callback. Using `async/await` in tests? `await` an array of `[err, req, res]`

```js
// middleware.js
import wrap from 'express-async-wrap'

export const middleware = users => wrap(async ({ params }, res, next) => {
  const { userId } = params
  const user = await users.findById(userId)
  if (!user) throw new Error('who?')
  res.locals.user = user
  next()
})
```

```js
// middleware.spec.js
describe('middleware', () => {
  context('when the user is found', () => {
    const user = { id: 1, name: 'foo' }
    before(() => stub(users, 'findById').resolves(user))
    after(() => users.findById.restore())
    const setup = (req, res, next) => {
      req.params.userId = 1
      next()
    }
    it('sets the user on locals', async () => {
      const [, , res] = await run(setup, middleware(users))
      expect(err).to.be.null
      expect(res.locals).to.have.property('user', user)
    })
  })
})
```
