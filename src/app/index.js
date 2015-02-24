
import 'bemuse/polyfill'
import * as Scintillator from 'bemuse/scintillator'

import co from 'co'
import $ from 'jquery'
import Chance from 'chance'

import GameNote from 'bemuse/game/data/game-note'
import NoteArea from 'bemuse/game/display/note-area'

export function main() {
  co(function*() {
    let skin      = yield Scintillator.load('/skins/default/skin.xml')
    let context   = new Scintillator.Context(skin)

    let notes     = generateRandomNotes()
    let area      = new NoteArea(notes)

    let data = { }
    let columns = ['SC', '1', '2', '3', '4', '5', '6', '7']

    function updateNotes() {
      let p = data.t * 192 / 60
      for (let column of columns) {
        data[`note_${column}`].length = 0
        data[`longnote_${column}`].length = 0
      }
      let entities = area.getVisibleNotes(p, p + (5 / 2.5))
      for (let entity of entities) {
        let note = entity.note
        let column = note.column
        if (entity.height) {
          data[`longnote_${column}`].push({
            key:    note.id,
            y:      entity.y * 550,
            height: entity.height * 550,
            active: entity.y + entity.height > 1,
            missed: entity.y + entity.height > 1.1 && note.id % 5 === 0,
          })
        } else {
          data[`note_${column}`].push({
            key:    note.id,
            y:      entity.y * 550,
          })
        }
      }
    }

    for (let column of columns) {
      data[`note_${column}`] = []
      data[`longnote_${column}`] = []
    }

    let started = new Date().getTime()
    let draw = () => {
      data.t = (new Date().getTime() - started) / 1000
      updateNotes()
      context.render(data)
    }
    draw()
    requestAnimationFrame(function f() {
      draw()
      requestAnimationFrame(f)
    })
    showCanvas(context.view)
  })
  .done()

}

function generateRandomNotes() {
  let notes = []
  let chance = new Chance(1234)
  let columns = ['SC', '1', '2', '3', '4', '5', '6', '7']
  let nextId = 1
  for (let column of columns) {
    let position = 4
    for (let j = 0; j < 2000; j ++) {
      position += chance.integer({ min: 1, max: 6 }) / 4
      let length = chance.bool({ likelihood: 10 }) ?
                      chance.integer({ min: 1, max: 24 }) / 4 : 0
      let id = nextId++
      if (length > 0) {
        let end = { position: position + length, beat: 0, time: 0 }
        notes.push(new GameNote({ position: position, end, column, id,
                    beat: 0, time: 0, }))
        position = end.position
      } else {
        notes.push(new GameNote({ position: position, column, id,
                    beat: 0, time: 0, end: null, }))
      }
    }
  }
  return notes
}

function showCanvas(view) {

  var { width, height } = view

  view.style.display = 'block'
  view.style.margin = '0 auto'

  document.body.appendChild(view)
  resize()
  $(window).on('resize', resize)

  function resize() {
    var scale = Math.min(
      window.innerWidth / width,
      window.innerHeight / height
    )
    view.style.width = Math.round(width * scale) + 'px'
    view.style.height = Math.round(height * scale) + 'px'
  }

}
