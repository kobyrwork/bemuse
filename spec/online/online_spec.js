
import { Parse } from 'parse'

import query  from 'bemuse/utils/query'
import Online from 'bemuse/online'

if (query.PARSE_APP_ID && query.PARSE_API_KEY) {
  tests(query.PARSE_APP_ID, query.PARSE_API_KEY)
} else {
  describe('Online', function() {
    xit('Set PARSE_APP_ID and PARSE_API_KEY to test')
  })
}

function tests(APP_ID, JS_KEY) {

  describe('Online', function() {

    function createAccountInfo() {
      return {
        username: 'bemuse_test_' + new Date().getTime(),
        password: 'wow_bemuse_test',
        email: 'test+' + new Date().getTime() + '@bemuse.ninja',
      }
    }

    this.timeout(10000)

    let online

    before(function() {
      Parse.initialize(APP_ID, JS_KEY)
    })

    beforeEach(function(){
      online = new Online()
    })

    describe('signup', function() {
      let info
      before(function() {
        info = createAccountInfo()
      })
      it('should succeed', function() {
        return expect(online.signUp(info)).to.be.fulfilled
      })
      it('should not allow duplicate signup', function() {
        return expect(online.signUp(info)).to.be.rejectedWith(Error)
      })
    })

    describe('initially', function() {
      beforeEach(function() {
        online.logOut()
      })
      beforeEach(function() {
        online = new Online()
      })
      describe('user川', function() {
        it('should be null', function() {
          return expect(online.user川.first().toPromise()).to.eventually.be.null
        })
      })
    })

    describe('when signed up', function() {
      describe('user川', function() {
        it('should change to signed-up user, and also start with it', function() {
          let info = createAccountInfo()
          let promise = (
            online.user川.take(2).toPromise()
            .then(user => {
              expect(user.username).to.equal(info.username)
            })
            .tap(() => {
              return new Online().user川.first().toPromise().then(user => {
                expect(user.username).to.equal(info.username)
              })
            })
          )
          Promise.resolve(online.signUp(info)).done()
          return promise
        })
      })
    })

    describe('with an active user', function() {
      let info = createAccountInfo()
      before(function() {
        return online.signUp(info)
      })
      beforeEach(function() {
        return online.logIn(info)
      })
      describe('when log out', function() {
        it('should change user川 back to null', function() {
          let promise = online.user川.take(2).toPromise().then(user => {
            void expect(user).to.be.null
          })
          Promise.resolve(online.logOut()).done()
          return promise
        })
      })
    })

    describe('submitting high scores', function() {

      var prefix = 'bemusetest' + new Date().getTime() + '_'
      var user1 = createAccountInfo()

      steps(step => {
        let lastRecordedAt
        step('sign up...', function() {
          return online.signUp(user1)
        })
        step('records data successfully', function() {
          return Promise.resolve(online.submitScore({
            md5: prefix + 'song',
            playMode: 'BM',
            score: 123456,
            combo: 123,
            total: 456,
            count: [122, 1, 0, 0, 333],
            log: ''
          }))
          .tap(function(record) {
            expect(record.playNumber).to.equal(1)
            expect(record.playCount).to.equal(1)
            expect(record.recordedAt).to.be.an.instanceof(Date)
            lastRecordedAt = record.recordedAt
          })
        })
        step('does not update if new score is better, but update play count', function() {
          return Promise.resolve(online.submitScore({
            md5: prefix + 'song',
            playMode: 'BM',
            score: 123210,
            combo: 124,
            total: 456,
            count: [123, 1, 0, 0, 332],
            log: ''
          }))
          .tap(function(record) {
            expect(record.score).to.equal(123456)
            expect(record.combo).to.equal(123)
            expect(record.playNumber).to.equal(1)
            expect(record.playCount).to.equal(2)
            expect(record.recordedAt).not.to.be.above(lastRecordedAt)
            lastRecordedAt = record.recordedAt
          })
        })
        step('updates data if new score is better', function() {
          return Promise.resolve(online.submitScore({
            md5: prefix + 'song',
            playMode: 'BM',
            score: 555555,
            combo: 456,
            total: 456,
            count: [456, 0, 0, 0, 0],
            log: ''
          }))
          .tap(function(record) {
            expect(record.score).to.equal(555555)
            expect(record.combo).to.equal(456)
            expect(record.playNumber).to.equal(3)
            expect(record.playCount).to.equal(3)
            expect(record.recordedAt).to.be.above(lastRecordedAt)
            lastRecordedAt = record.recordedAt
          })
        })
      })

    })

    xdescribe('the scoreboard', function() {

      var prefix = 'bemusetest' + new Date().getTime() + '_'
      var user1 = createAccountInfo()
      var user2 = createAccountInfo()

      steps(step => {
        step('sign up user1...', function() {
          return online.signUp(user1)
        })
        step('submit score1...', function() {
          return online.submitScore({
            md5: prefix + 'song1',
            playMode: 'BM',
            score: 222222,
            combo: 456,
            total: 456,
            count: [0, 0, 456, 0, 0],
            log: ''
          })
        })
        step('sign up user2...', function() {
          return online.signUp(user2)
        })
        step('submit score2...', function() {
          return online.submitScore({
            md5: prefix + 'song1',
            playMode: 'BM',
            score: 555555,
            combo: 456,
            total: 456,
            count: [456, 0, 0, 0, 0],
            log: ''
          })
        })
        step('scoreboard should return the top score', function() {
          return Promise.resolve(online.getScoreboard({
            md5: prefix + 'song',
            playMode: 'BM',
          }))
          .tap(function(result) {
            expect(result.data).to.have.length(2)
          })
        })
      })

    })

  })
}

function steps(callback) {
  var resolve
  var promise = new Promise(_resolve => resolve = _resolve)
  var i = 0
  before(() => void resolve())
  return callback((name, fn) => {
    promise = (
      promise
      .then(
        fn,
        () => { throw new Error('Previous steps errored') }
      )
    )
    let current = promise
    it(`${++i}. ${name}`, () => current)
  })
}
