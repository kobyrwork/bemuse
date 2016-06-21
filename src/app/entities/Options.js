
import * as options from '../options'

// Initializers
export const initialState = options.DEFAULTS
export const initWithDataFromStorage = (options) => ({ ...initialState, ...options })

// Queries
export const playMode = (state) => state['player.P1.mode']
export const scratchPosition = (state) => {
  if (state['player.P1.mode'] === 'KB') {
    return 'off'
  } else {
    return state['player.P1.scratch']
  }
}
export const keyboardMapping = (state) => {
  let mapping = { }
  for (let control of ['1', '2', '3', '4', '5', '6', '7', 'SC', 'SC2']) {
    let key = 'input.P1.keyboard.' + playMode(state) + '.' + control
    mapping[control] = state[key] || ''
  }
  return mapping
}

// Utils
export const nextKeyToEdit = (editing, scratch) => {
  const keySet = (() => {
    if (scratch === 'left') {
      return ['SC', 'SC2', '1', '2', '3', '4', '5', '6', '7']
    } else if (scratch === 'right') {
      return ['1', '2', '3', '4', '5', '6', '7', 'SC', 'SC2']
    } else {
      return ['1', '2', '3', '4', '5', '6', '7']
    }
  })()
  const index = keySet.indexOf(editing)
  if (index < 0) return null
  return keySet[index + 1] || null
}
