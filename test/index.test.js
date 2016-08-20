import { describe, it } from 'global'
import { expect, spy } from './__setup__'
import { connect } from '../src'

describe('connect', () => {

  it('invokes a middleware', () => {
    const mySpy = spy()
    connect(mySpy)
    expect(mySpy).to.have.been.called
  })

})
