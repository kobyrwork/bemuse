import assert from 'power-assert'

import GameInput from '../input'
import Player from '../player'
import PlayerState from './player-state'
import { notechart } from '../test-helpers'

describe('PlayerState', function () {
  it('updates the input', function () {
    let state = new PlayerState({
      number: 1,
      columns: ['wow'],
      notechart: notechart(''),
      options: { speed: 1 }
    })
    let input = {
      get: name => ({ name })
    }
    state.update(0, input)
    expect(state.input.get('wow').name).to.equal('p1_wow')
  })

  describe('with player and chart', function () {
    let chart
    let player
    let state
    let input
    let buttons

    function setup (bms, options = { speed: 1 }) {
      chart = notechart(bms)
      player = new Player(chart, 1, options)
      state = new PlayerState(player)
      input = new GameInput()
      buttons = { }
      input.use({ get: () => buttons })
    }

    function advance (time, b) {
      buttons = b
      input.update()
      state.update(time, input)
    }

    describe('node judging', function () {
      it('judges notes', function () {
        setup(`
          #BPM 120
          #00111:0101
        `)

        let column = chart.notes[0].column

        expect(state.getNoteStatus(chart.notes[0])).to.equal('unjudged')
        expect(state.stats.combo).to.equal(0)
        expect(state.stats.poor).to.equal(false)
        expect(state.stats.totalCombo).to.equal(2)
        void expect(state.notifications.judgments).to.be.empty

        advance(1.999, { })
        expect(state.getNoteStatus(chart.notes[0])).to.equal('unjudged')

        advance(2, { 'p1_1': 1 })
        expect(state.getNoteStatus(chart.notes[0])).to.equal('judged')
        expect(state.getNoteJudgment(chart.notes[0])).to.equal(1)
        expect(state.getNoteStatus(chart.notes[1])).to.equal('unjudged')
        expect(state.notifications.judgments[0]).to.deep.equal({
          judgment: 1, combo: 1, delta: 0, column })
        expect(state.stats.poor).to.equal(false)

        advance(2.1, { 'p1_1': 0 })
        advance(5, { 'p1_1': 0 })
        expect(state.getNoteStatus(chart.notes[1])).to.equal('judged')
        expect(state.getNoteJudgment(chart.notes[1])).to.equal(-1)
        expect(state.notifications.judgments[0]).to.deep.equal({
          judgment: -1, combo: 0, delta: 2, column })
        expect(state.stats.poor).to.equal(true)
      })

      it('judges multiple notes in different column', function () {
        setup(`
          #BPM 120
          #00111:01
          #00112:01
        `)

        advance(2, { 'p1_1': 1, 'p1_2': 1 })
        expect(state.getNoteStatus(chart.notes[0])).to.equal('judged')
        expect(state.getNoteStatus(chart.notes[1])).to.equal('judged')
      })

      it('judges single note from one column at a time', function () {
        setup(`
          #BPM 480
          #00111:01010100000000000000000000000000
        `)

        advance(0.531, { 'p1_1': 1 })
        expect(state.getNoteStatus(chart.notes[0])).to.equal('judged')
        expect(state.getNoteStatus(chart.notes[1])).to.equal('unjudged')
        expect(state.getNoteStatus(chart.notes[2])).to.equal('unjudged')
        advance(0.531, { 'p1_1': 0 })
        advance(0.531, { 'p1_1': 1 })
        expect(state.getNoteStatus(chart.notes[0])).to.equal('judged')
        expect(state.getNoteStatus(chart.notes[1])).to.equal('judged')
        expect(state.getNoteStatus(chart.notes[2])).to.equal('unjudged')
        advance(0.531, { 'p1_1': 0 })
        advance(0.531, { 'p1_1': 1 })
        expect(state.getNoteStatus(chart.notes[0])).to.equal('judged')
        expect(state.getNoteStatus(chart.notes[1])).to.equal('judged')
        expect(state.getNoteStatus(chart.notes[2])).to.equal('judged')

        expect(state.getNoteJudgment(chart.notes[0])).to.gt(1)
        expect(state.getNoteJudgment(chart.notes[1])).to.eq(1)
        expect(state.getNoteJudgment(chart.notes[2])).to.gt(1)
      })

      it('leaves note unjudged when bad and there are closer note', function () {
        setup(`
          #BPM 120
          #00111:01010100000000000000000000000000
        `)

        advance(2.125, { 'p1_1': 1 })
        expect(state.getNoteStatus(chart.notes[0])).to.equal('unjudged')
        expect(state.getNoteStatus(chart.notes[1])).to.equal('judged')
        expect(state.getNoteStatus(chart.notes[2])).to.equal('unjudged')
      })

      it('records delta when pressed', function () {
        setup(`
          #BPM 120
          #00111:01
        `)
        sinon.spy(state.stats, 'handleDelta')
        advance(2.01, { 'p1_1': 1 })
        expect(state.stats.handleDelta).to.have.been.calledWith(2.01 - 2)
      })

      it('does not record delta when missed', function () {
        setup(`
          #BPM 120
          #00111:01
        `)
        sinon.spy(state.stats, 'handleDelta')
        advance(9, { 'p1_1': 1 })
        expect(state.stats.handleDelta).to.have.callCount(0)
      })

      describe('with long note', function () {
        let note
        beforeEach(function () {
          setup(`
            #BPM 120
            #00151:0101
          `)
          note = chart.notes[0]
        })
        it('judges long note', function () {
          advance(2, { 'p1_1': 1 })
          expect(state.getNoteStatus(note)).to.equal('active')
          expect(state.getNoteJudgment(note)).to.equal(1)
          expect(state.notifications.judgments[0].judgment).to.equal(1)
          advance(3, { 'p1_1': 0 })
          expect(state.getNoteStatus(note)).to.equal('judged')
          expect(state.getNoteJudgment(note)).to.equal(1)
          expect(state.notifications.judgments[0].judgment).to.equal(1)
        })
        it('gives 2 discrete judgments, one for down and one for up', function () {
          advance(2, { 'p1_1': 1 })
          assert(state.stats.numJudgments === 1)
          advance(3, { 'p1_1': 0 })
          assert(state.stats.numJudgments === 2)
        })
        it('records delta once', function () {
          sinon.spy(state.stats, 'handleDelta')
          advance(2, { 'p1_1': 1 })
          advance(3, { 'p1_1': 0 })
          expect(state.stats.handleDelta).to.have.callCount(1)
        })
        it('judges missed long note', function () {
          advance(2.3, { 'p1_1': 1 })
          expect(state.getNoteStatus(note)).to.equal('judged')
          expect(state.getNoteJudgment(note)).to.equal(-1)
        })
        it('gives 2 missed judgment for missed longnote', function () {
          advance(2.3, { 'p1_1': 1 })
          assert(state.stats.numJudgments === 2)
        })
        it('judges long note lifted too fast as missed', function () {
          advance(2, { 'p1_1': 1 })
          advance(2.01, { 'p1_1': 0 })
          expect(state.getNoteStatus(note)).to.equal('judged')
          expect(state.getNoteJudgment(note)).to.equal(-1)
          assert(state.stats.numJudgments === 2)
        })
        it('does not end automatically', function () {
          advance(2, { 'p1_1': 1 })
          advance(3.1, { 'p1_1': 1 })
          expect(state.getNoteStatus(note)).to.equal('active')
          assert(state.stats.numJudgments === 1)
        })
        it('judges long note lifted too slow as missed', function () {
          advance(2, { 'p1_1': 1 })
          advance(4, { 'p1_1': 1 })
          expect(state.getNoteStatus(note)).to.equal('judged')
          expect(state.getNoteJudgment(note)).to.equal(-1)
          expect(state.notifications.judgments[0]).to.deep.equal({
            judgment: -1, combo: 0, delta: 1, column: note.column })
        })
      })

      describe('with long scratch note', function () {
        let note
        beforeEach(function () {
          setup(`
            #BPM 120
            #00156:0101
          `)
          note = chart.notes[0]
        })
        it('ends automatically', function () {
          advance(2, { 'p1_SC': 1 })
          expect(state.getNoteStatus(note)).to.equal('active')
          expect(state.getNoteJudgment(note)).to.equal(1)
          expect(state.notifications.judgments[0].judgment).to.equal(1)
          advance(3.1, { 'p1_SC': 1 })
          expect(state.getNoteStatus(note)).to.equal('judged')
          expect(state.getNoteJudgment(note)).to.equal(1)
          expect(state.notifications.judgments[0].judgment).to.equal(1)
        })
      })

      describe('with long scratch note next to each other', function () {
        beforeEach(function () {
          setup(`
#BPM 120
#00156:0100000000000000000000000000000000000000000000000000000000000001
#00256:0100000000000000000000000000000000000000000000000000000000000001
          `)
        })
        it('should switch to next one on change', function () {
          advance(2, { 'p1_SC': 1 })
          advance(4, { 'p1_SC': -1 })
          expect(state.getNoteStatus(chart.notes[0])).to.equal('judged')
          expect(state.getNoteStatus(chart.notes[1])).to.equal('active')
        })
      })

      describe('sound notifications', function () {
        it('notifies of note hit', function () {
          setup(`
            #BPM 120
            #00111:0102
          `)
          advance(2, { 'p1_1': 1 })
          expect(state.notifications.sounds[0].note).to.equal(chart.notes[0])
          expect(state.notifications.sounds[0].type).to.equal('hit')
        })
        it('should notify missed notes as break', function () {
          setup(`
            #BPM 120
            #00111:01
          `)
          advance(5, { 'p1_1': 0 })
          expect(state.notifications.sounds[0].note).to.equal(chart.notes[0])
          expect(state.notifications.sounds[0].type).to.equal('break')
        })
        it('notifies of free keysound hit', function () {
          setup(`
            #BPM 60
            #00111:01
            #00211:02
          `)

          // hit the first note
          advance(4, { 'p1_1': 1 })
          advance(4, { 'p1_1': 0 })

          // hit the blank area
          advance(4, { 'p1_1': 1 })
          expect(state.notifications.sounds[0].note).to.equal(chart.notes[0])
          expect(state.notifications.sounds[0].type).to.equal('free')

          // release the button
          advance(4, { 'p1_1': 0 })
          void expect(state.notifications.sounds).to.be.empty

          // try again
          advance(5, { 'p1_1': 1 })
          expect(state.notifications.sounds[0].note).to.equal(chart.notes[0])

          // release the button
          advance(5, { 'p1_1': 0 })

          // wait and try again.
          advance(6.5, { 'p1_1': 1 })
          expect(state.notifications.sounds[0].note).to.equal(chart.notes[0])
          advance(6.5, { 'p1_1': 0 })

          // wait and try again. this time keysound should change
          advance(7.5, { 'p1_1': 1 })
          expect(state.notifications.sounds[0].note).to.equal(chart.notes[1])
        })
      })
    })

    describe('speed', function () {
      it('infers speed from player', function () {
        setup('', { speed: 2 })
        expect(state.speed).to.equal(2)
      })
      it('updates speed on dedicated buttons', function () {
        setup('', { speed: 2 })
        advance(1.0, { 'p1_speedup': 1 })
        expect(state.speed).to.equal(2.5)
        advance(1.2, { 'p1_speedup': 0, 'p1_speeddown': 1 })
        expect(state.speed).to.equal(2)
      })
      it('supports fine-grained speed modifications', function () {
        setup('', { speed: 2 })
        advance(1.0, { 'p1_speedup': 1, 'select': 1 })
        expect(state.speed).to.equal(2.1)
      })
      it('supports pinching to zoom', function () {
        setup('', { speed: 2 })
        advance(1.0, { 'p1_pinch': 300 })
        advance(1.2, { 'p1_pinch': 450 })
        expect(state.speed).to.equal(3)
      })
    })

    describe('finish', function () {
      it('should become true when song is finished', function () {
        setup('#00111:0101')
        expect(state.finished).to.equal(false)
        advance(4.0, { })
        expect(state.finished).to.equal(false)
        advance(16.0, { })
        expect(state.finished).to.equal(true)
      })
    })
  })
})
