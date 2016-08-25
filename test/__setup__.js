import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

chai.use(sinonChai)

const { expect, AssertionError } = chai
const { spy, stub } = sinon

export { expect, spy, stub, AssertionError }
