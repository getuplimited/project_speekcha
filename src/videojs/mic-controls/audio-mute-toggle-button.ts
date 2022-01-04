import videojs from 'video.js';

interface AudioMuteToggleButtonOptions {
  muteLocalMic: any;
  unmuteLocalMic: any;
  isMicMuted: boolean;
}

const Button = videojs.getComponent('Button');

class AudioMuteToggleButton extends Button {
  private initialized = false;

  private isMicMuted = false;

  private _options: AudioMuteToggleButtonOptions;

  constructor(player: videojs.Player, options: any) {
    super(player, options);
    this._options = options;
    if (typeof this._options.isMicMuted !== 'undefined') {
      this.isMicMuted = this._options.isMicMuted;
    }
    if (player.readyState()) {
      this.initialized = true;
      const text = this.isMicMuted
        ? 'Unmute Local Mic'
        : 'Mute Local Mic';
      this.controlText(text);
    }
    this.on(player, 'timeupdate', () => {
      if (this.initialized) {
        this.update();
      }
    });
  }

  update() {}

  buildCSSClass() {
    return `vjs-audio  ${super.buildCSSClass()}`;
  }

  handleClick() {
    const { muteLocalMic, unmuteLocalMic } = this._options;
    if (this.initialized) {
      const audio = document.querySelector('.vjs-audio');
      audio.classList.toggle('vjs-audio-off');
      let controlText = '';
      if (this.isMicMuted) {
        unmuteLocalMic();
        controlText = 'Mute Local Mic';
      } else {
        muteLocalMic();
        controlText = 'Unmute Local Mic';
      }

      if (this.controlText() !== controlText) {
        this.controlText(controlText);
      }
      this.isMicMuted = !this.isMicMuted;
    }
  }
}

videojs.registerComponent('AudioMuteToggleButton', AudioMuteToggleButton);
export default AudioMuteToggleButton;
