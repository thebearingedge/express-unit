Express Unit
--
Express middleware testing made easy.

[![Build Status](https://travis-ci.org/thebearingedge/express-unit.svg?branch=master)](https://travis-ci.org/thebearingedge/express-unit.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/thebearingedge/express-unit/badge.svg?branch=master)](https://coveralls.io/github/thebearingedge/express-unit?branch=master)

`λ npm install express-unit`

### Contents
 - [Usage](#usage)
   + [Setup](#setup)
   + [Callbacks](#callbacks)
   + [Async](#async)
 - [Why Express Unit?](#why-express-unit)
---

### Usage

Express Unit exports a helper function for running a single middleware. To use, just `import` it and pass it a `setup` function, your `middleware`, and an optional callback.

```js
run(setup, middleware[, callback])
```

#### Parameters

- `setup` - A function defined to set up the Request/Response lifecycle _before_ it enters `middelware`. Pass `null` if not needed.
- `middleware` - The middleware under test.
- `callback` - Optional function used to inspect the result of passing the Request/Response lifecycle through `middleware`.

```js
import run from 'express-unit'
import { expect, spy } from './test-utils'
import myMiddleware from './my-middleware'

describe('myMiddleware', () => {
  it('gets called!', () => {
    const setup = spy((req, res, next) => next())
    const middleware = spy(myMiddleware)
    run(setup, middleware)
    expect(setup).to.have.been.calledBefore(middleware)
  })
})
```

### Setup

Your setup function will be called with a `req`, `res`, and `next` to prepare the request lifecycle for your middleware. This is your opportunity to set headers on `req` or spy on any relevant methods on `res`. Call `next` to execute your middleware.

If for some reason you don't want to supply a setup, just pass `null`.

```js
run(null, middleware[, callback])
```

```js
// middleware.js
export default function middleware(req, res, next) {
  const token = req.get('x-access-token')
  if (token) return next()
  const err = new Error('where is your token?')
  next(err)
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

### Callback

Express Unit supports callbacks. Pass a callback as the third argument to inspect the results.

```js
// middleware.js
export default function middleware(req, res, next) {
  const token = req.get('x-access-token')
  if (token) return next()
  const err = new Error('Access token required.')
  return next(err)
}
```

```js
// middleware.spec.js
describe('middleware', () => {
  context('when the request does not have a token header', () => {
    it('passes an Error', done => {
      run(null, middleware, (err, req, res) => {
        expect(err)
          .to.be.an('error')
          .with.property('message', 'Access token required.')
        expect()
        done()
      })
    })
  })
})
```

### Async/Await

Express Unit also supports `async` middleware. This is any middleware that is an `async` function or simply returns a `Promise`. `express-unit` will resolve an array of `[err, req, res]` that you can either `await` or receive in a call to `then`. Works great with [`express-async-wrap`](https://github.com/Greenfields/express-async-wrap).

```js
// middleware.js
import wrap from 'express-async-wrap'

export const middleware = users => wrap(async ({ params }, res, next) => {
  const { userId } = params
  const user = await users.findById(userId)
  if (!user) throw new NotFound(`User ${userId} does not exist.`)
  res.locals.user = user
  next()
})
```

```js
// middleware.spec.js
describe('middleware', () => {
  const user = { id: 1, name: 'foo' }
  afterEach(() => {
    users.findById.restore()
  })
  context('when the user is found', () => {
    const setup = (req, res, next) => {
      req.params.userId = 1
      stub(users, 'findById').resolves(user)
      next()
    }
    it('sets the user on locals', async () => {
      const [ err, , res] = await run(setup, middleware(users))
      expect(err).to.be.null
      expect(users.findById).to.have.been.calledWith(user.id)
      expect(res.locals).to.have.property('user', user)
    })
  })
})
```
---

### Why Express Unit?

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
