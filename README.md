express-unit
--

Express middleware testing made easy.

[![Build Status](https://travis-ci.org/thebearingedge/express-unit.svg?branch=master)](https://travis-ci.org/thebearingedge/express-unit.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/thebearingedge/express-unit/badge.svg?branch=master)](https://coveralls.io/github/thebearingedge/express-unit?branch=master)
[![Dependency Status](https://david-dm.org/thebearingedge/express-unit.svg)](https://david-dm.org/thebearingedge/express-unit)
[![Dev Dependency Status](https://david-dm.org/thebearingedge/express-unit/dev-status.svg)](https://david-dm.org/thebearingedge/express-unit)
[![Greenkeeper badge](https://badges.greenkeeper.io/thebearingedge/express-unit.svg)](https://greenkeeper.io/)

`λ npm install express-unit`

### Contents

 - [Usage](#usage)
   + [Setup](#setup)
   + [Callbacks](#callbacks)
   + [Async](#async)
 - [Why Express Unit?](#why-express-unit)
---

### Usage

Express Unit exports a helper function for running a single middleware. To use, just `import` it and pass it a `setup` function, your `middleware`, and an optional `callback`.

```js
import run from 'express-unit'

run(setup|null, middleware[, callback])
```

#### Parameters

- `setup` - A function defined to set up the Request/Response lifecycle _before_ it enters `middleware`. Pass `null` if not needed. `setup` is called with three arguments:
  - `req` - A dummy `Request` object.
  - `res` - A dummy `Response` object.
  - `next` - A function used to proceed to `middleware`.
- `middleware` - The middleware function under test. Passed different arguments depending on whether it is an ["error handling" middleware](http://expressjs.com/en/guide/error-handling.html).
  - `err` - forwarded from `next(err)` in `setup` if the middleware is an error handler.
  - `req` - The dummy `Request` object visited by `setup`.
  - `res` - The dummy `Response` object visited by `setup`.
  - `next` - A function used to signal the completion of the `middlware`.
- `callback` - An optional function used to inspect the outcome of passing the Request/Response lifecycle through `setup` and `middleware`.
  - `err` - Forwarded from `next(err)` in `middleware` (if any).
  - `req` - The dummy `Request` object visited by `setup` and `middleware`.
  - `res` - The dummy `Response` object visited by `setup` and `middleware`.

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

### `setup`

Your setup function will be called with a `req`, `res`, and `next` to prepare the request lifecycle for your middleware. This is your opportunity to set headers on `req` or spy/stub any relevant methods on `res`. Call `next` to execute your middleware.

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
// middleware.test.js
describe('middleware', () => {
  describe('when the request has a token header', () => {
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
// middleware.test.js
describe('middleware', () => {
  describe('when the request does not have a token header', () => {
    it('passes an Error', done => {
      run(null, middleware, (err, req, res) => {
        expect(err)
          .to.be.an('error')
          .with.property('message', 'Access token required.')
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
// middleware.test.js
describe('middleware', () => {
  const user = { id: 1, name: 'foo' }
  afterEach(() => {
    users.findById.restore()
  })
  describe('when the user is found', () => {
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

Express Unit puts the "unit" back in [unit testing](https://en.wikipedia.org/wiki/Unit_testing) for Express.js apps. It's a small, simple helper for exercising individual middleware functions in isolation. Most testing tutorials and examples for `express` apps will utilize `supertest` (or similar).

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

This is great for testing your entire `app` or a given `router` within your `app`. For some endpoints, various middleware functions are put in place to determine the response, e.g. confirming a user's identity, verifying their access rights, and bailing out of a request early if preconditions are not met. But testing all of this in concert is [integration testing](https://en.wikipedia.org/wiki/Integration_testing), which is often best left at testing the ["happy path"](https://en.wikipedia.org/wiki/Happy_path). A single route could employ a middleware stack like this:

```js
router
  .use(authorize)
  .route('/users/:userId/permissions')
  .put(userIs('admin'), updatePermissions(permissions))

router
  .use(errorHandler(logger))
```

There are 4 different middleware functions involved in this single route. At least one of which needs access to some kind of data store. But each middleware is very focused and can be reused or replaced (Yay!).
