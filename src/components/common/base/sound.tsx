import { message } from 'antd';
import * as React from 'react';
import './sound.less';

interface Props {
  soundUrl?: string;
  volumn?: number;
}

export default class SoundComponent extends React.PureComponent<Props> {
  componentDidMount() {
    const { soundUrl, volumn } = this.props;
    const audio = document.createElement('audio');
    audio.setAttribute('src', soundUrl || '/sounds/default-audio.mp3');
    audio.setAttribute('id', 'audio');
    audio.volume = volumn || 0.5;
    const container = document.querySelector('.sound-player');
    container.append(audio);
  }

  componentDidUpdate(prevProps: Props) {
    const { soundUrl } = this.props;
    if (soundUrl && soundUrl !== prevProps.soundUrl) {
      let audio = document.getElementById('audio');
      const container = document.querySelector('.sound-player');
      if (!audio) {
        audio = document.createElement('audio');
        audio.setAttribute('id', 'audio');
        container.append(audio);
      }
      audio.setAttribute(
        'src',
        soundUrl || '/sounds/default-audio.mp3'
      );
    }
  }

  async play() {
    const audio = document.getElementById('audio') as HTMLMediaElement;
    if (audio) {
      try {
        await audio.play();
      } catch (e) {
        message.error('Sound can not play. Interact with the document first!', 3);
      }
    }
  }

  render() {
    return <div className="sound-player" />;
  }
}
