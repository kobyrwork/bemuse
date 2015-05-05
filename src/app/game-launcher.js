
import co           from 'co'
import { resolve }  from 'url'
import screenfull   from 'screenfull'
import React        from 'react'

// TODO: remove this dependency and use Options
import query                  from 'bemuse/utils/query'

import SCENE_MANAGER          from 'bemuse/scene-manager'
import URLResource            from 'bemuse/resources/url'
import BemusePackageResources from 'bemuse/resources/bemuse-package'
import * as GameLoader        from 'bemuse/game/loaders/game-loader'
import GameScene              from 'bemuse/game/game-scene'
import LoadingScene           from 'bemuse/game/ui/loading-scene.jsx'
import ResultScene            from './ui/result-scene'
import * as Options           from './options'
import * as Analytics         from './analytics'
import { MISSED }             from 'bemuse/game/judgments'

import { shouldDisableFullScreen } from 'bemuse/devtools/query-flags'

export function launch({ server, song, chart }) {
  return co(function*() {

    // go fullscreen
    if (screenfull.enabled && !shouldDisableFullScreen()) {
      let safari = /Safari/.test(navigator.userAgent) &&
                  !/Chrom/.test(navigator.userAgent)
      if (!safari) screenfull.request()
    }

    // prepare data necessary to load the game
    let url       = server.url + '/' + song.path + '/' + chart.file
    let assetsUrl = resolve(url, 'assets/')
    let loadSpec = {
      bms:      new URLResource(url),
      assets:   new BemusePackageResources(assetsUrl),
      options:  {
        audioInputLatency: +query.latency || 0,
        tutorial: song.tutorial,
        players: [
          {
            speed:      +Options.get('player.P1.speed') || 1,
            autoplay:   false,
            placement:  Options.get('player.P1.panel'),
            scratch:    Options.get('player.P1.scratch'),
            input: {
              keyboard: Options.getKeyboardMapping(),
            }
          },
        ],
      },
    }

    // start loading the game
    let { tasks, promise } = GameLoader.load(loadSpec)

    // display loading scene
    let loadingScene = React.createElement(LoadingScene, {
      tasks: tasks,
      song:  chart.info,
    })
    yield SCENE_MANAGER.push(loadingScene)

    // send data to analytics
    Analytics.gameStart(song, chart)

    // wait for game to load and display the game
    let controller = yield promise
    yield SCENE_MANAGER.display(new GameScene(controller.display))
    controller.start()

    // wait for final game state
    let state = yield controller.promise

    // send data to analytics
    Analytics.gameFinish(song, chart, state)

    // get player's state and save options
    let playerState = state.player(state.game.players[0])
    Options.set('player.P1.speed', playerState.speed)

    // display evaluation
    if (state.finished) {
      yield showResult(playerState, chart)
    }
    controller.destroy()

    // go back to previous scene
    yield SCENE_MANAGER.pop()

  })
}

function showResult(playerState, chart) {
  return new Promise(_resolve => {
    let stats = playerState.stats
    let props = {
      result: {
        '1': stats.counts['1'],
        '2': stats.counts['2'],
        '3': stats.counts['3'],
        '4': stats.counts['4'],
        'missed':   stats.counts[MISSED],
        'score':    stats.score,
        'maxCombo': stats.maxCombo,
        'accuracy': stats.accuracy,
        'grade': getGrade(stats),
      },
      chart: chart,
      onExit: _resolve,
    }
    SCENE_MANAGER.display(React.createElement(ResultScene, props)).done()
  })
}

//#region grade
function getGrade(stats) {
  let score = stats.score
  if (score < 300000) return 'F'
  if (score < 350000) return 'D'
  if (score < 400000) return 'C'
  if (score < 450000) return 'B'
  if (score < 500000) return 'A'
  return 'S'
}
//#endregion
