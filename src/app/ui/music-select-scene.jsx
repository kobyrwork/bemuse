
import './music-select-scene.scss'

import React            from 'react'
import c                from 'classnames'
import { Binding }      from 'bemuse/flux'
import SCENE_MANAGER    from 'bemuse/scene-manager'
import online           from 'bemuse/online/instance'
import Scene            from 'bemuse/ui/scene'
import SceneHeading     from 'bemuse/ui/scene-heading'
import SceneToolbar     from 'bemuse/ui/scene-toolbar'
import ModalPopup       from 'bemuse/ui/modal-popup'

import AuthenticationPopup from 'bemuse/online/ui/authentication-popup'

import UnofficialPanel  from './unofficial-panel'
import MusicList        from './music-list'
import MusicInfo        from './music-info'
import Options          from './options'
import CustomBMS        from './custom-bms'
import Store            from '../stores/music-select-store'
import * as Actions     from '../actions/music-select-actions'

import * as CustomBMSActions from '../actions/custom-bms-actions'
import { shouldShowOptions } from 'bemuse/devtools/query-flags'

React.initializeTouchEvents(true)

export default React.createClass({

  render() {
    let musicSelect = this.state.musicSelect
    return <Scene className="music-select-scene">
      <Binding store={Store} onChange={this.handleState} />
      {online ? <Binding store={online.user川} onChange={this.handleUser} /> : null}
      <SceneHeading>
        Select Music
        <input
            type="text"
            placeholder="Filter…"
            className="music-select-scene--search"
            onChange={this.handleFilter}
            value={musicSelect.filterText} />
      </SceneHeading>
      {
        musicSelect.unofficial
        ? <div className="music-select-scene--unofficial-label"
              onClick={this.handleUnofficialClick}>
            <b>Disclaimer:</b> Unofficial Server
          </div>
        : null
      }
      {
        musicSelect.loading
        ? <div className="music-select-scene--loading">Loading…</div>
        : musicSelect.songs.length === 0
        ? <div className="music-select-scene--loading">
            Cannot Load Collection!
          </div>
        : <div className={c('music-select-scene--main',
              { 'is-in-song': this.state.inSong })}>
            <MusicList
                groups={musicSelect.groups}
                highlight={musicSelect.filterText}
                selectedSong={musicSelect.song}
                onSelect={this.handleSongSelect}
                onTouch={this.handleMusicListTouch} />
            <MusicInfo
                song={musicSelect.song}
                chart={musicSelect.chart}
                charts={musicSelect.charts}
                onChartClick={this.handleChartClick}
                onOptions={this.handleOptionsOpen} />
          </div>
      }
      <SceneToolbar>
        <a onClick={this.popScene} href="javascript://">Exit</a>
        <a onClick={this.handleCustomBMSOpen} href="javascript://"
            onDragEnter={this.handleCustomBMSOpen}>
          Play Custom BMS
        </a>
        <SceneToolbar.Spacer />
        {this.renderOnlineToolbarButtons()}
        <a onClick={this.handleOptionsOpen} href="javascript://">Options</a>
      </SceneToolbar>
      <ModalPopup
          visible={this.state.optionsVisible}
          onBackdropClick={this.handleOptionsClose}>
        <Options
            onClose={this.handleOptionsClose} />
      </ModalPopup>
      <ModalPopup
          visible={this.state.customBMSVisible}
          onBackdropClick={this.handleCustomBMSClose}>
        <div className="music-select-scene--custom-bms">
          <CustomBMS
              onSongLoaded={this.handleCustomSong} />
        </div>
      </ModalPopup>
      <ModalPopup
          visible={this.state.unofficialDisclaimerVisible}
          onBackdropClick={this.handleUnofficialClose}>
        <UnofficialPanel
            onClose={this.handleUnofficialClose} />
      </ModalPopup>
      <AuthenticationPopup
          visible={this.state.authenticationPopupVisible}
          onFinish={this.handleAuthenticationFinish}
          onBackdropClick={this.handleAuthenticationClose} />
    </Scene>
  },
  renderOnlineToolbarButtons() {
    if (!online) return null
    let buttons = []
    if (this.state.user) {
      buttons.push(
        <a onClick={this.handleLogout} href="javascript://online/logout" key="logout">
          Log Out
          ({this.state.user.username})
        </a>
      )
    } else {
      buttons.push(
        <a onClick={this.handleAuthenticate} href="javascript://online/logout" key="auth">
          Log In / Create an Account
        </a>
      )
    }
    return buttons
  },

  getInitialState() {
    return {
      musicSelect:                  Store.get(),
      optionsVisible:               shouldShowOptions(),
      customBMSVisible:             false,
      unofficialDisclaimerVisible:  false,
      inSong:                       false,
      user:                         null,
      authenticationPopupVisible:   false,
    }
  },
  handleState(state) {
    this.setState({ musicSelect: state })
  },
  handleUser(user) {
    this.setState({ user: user })
  },
  handleSongSelect(song) {
    Actions.selectSong(song)
    this.setState({ inSong: true })
  },
  handleMusicListTouch() {
    this.setState({ inSong: false })
  },
  handleChartClick(chart) {
    if (this.state.musicSelect.chart.md5 === chart.md5) {
      Actions.launchGame()
    } else {
      Actions.selectChart(chart)
    }
  },
  handleFilter(e) {
    Actions.setFilterText(e.target.value)
  },
  handleOptionsOpen() {
    this.setState({ optionsVisible: true })
  },
  handleOptionsClose() {
    this.setState({ optionsVisible: false })
  },
  handleCustomBMSOpen() {
    CustomBMSActions.clear()
    this.setState({ customBMSVisible: true })
  },
  handleCustomBMSClose() {
    this.setState({ customBMSVisible: false })
  },
  handleCustomSong(song) {
    Actions.setCustomSong(song)
    this.setState({ customBMSVisible: false })
  },
  handleUnofficialClick() {
    this.setState({ unofficialDisclaimerVisible: true })
  },
  handleUnofficialClose() {
    this.setState({ unofficialDisclaimerVisible: false })
  },
  handleLogout() {
    if (confirm('Do you really want to log out?')) {
      Promise.resolve(online.logOut()).done()
    }
  },
  handleAuthenticate() {
    this.setState({ authenticationPopupVisible: true })
  },
  handleAuthenticationClose() {
    this.setState({ authenticationPopupVisible: false })
  },
  handleAuthenticationFinish() {
    this.setState({ authenticationPopupVisible: false })
  },
  popScene() {
    SCENE_MANAGER.pop().done()
  },

})
