/* eslint-disable camelcase */
import React, { PureComponent } from 'react';
import withAntmedia from 'src/antmedia';
import { Button, Badge, message } from 'antd';
import { getResponseError } from '@lib/utils';
import { streamService } from 'src/services';
import { StreamSettings } from 'src/interfaces';
import videojs from 'video.js';
import MicControlsPlugin from 'src/videojs/mic-controls/plugin';
import './index.less';
import { WEBRTC_ADAPTOR_INFORMATIONS } from 'src/antmedia/constants';
import Router from 'next/router';

interface IProps {
  participantId?: string;
  className?: string;
  webRTCAdaptor: any;
  initWebRTCAdaptor: Function;
  leaveSession: Function;
  muteLocalMic: Function;
  unmuteLocalMic: Function;
  publish_started: boolean;
  initialized: boolean;
  settings: StreamSettings;
}

interface States {
  streamId: string;
}

class Publisher extends PureComponent<IProps, States> {
  private publisher: videojs.Player;

  constructor(props) {
    super(props);
    this.state = {
      streamId: ''
    };
  }

  componentDidMount() {
    videojs.registerPlugin('webRTCMicControlsPlugin', MicControlsPlugin);
    Router.events.on('routeChangeStart', this.onbeforeunload);
    window.addEventListener('beforeunload', this.onbeforeunload);
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onbeforeunload);
    Router.events.off('routeChangeStart', this.onbeforeunload);
  }

  async handlePublishing(streamId: string) {
    const { webRTCAdaptor, leaveSession, settings } = this.props;
    try {
      const token = await streamService.getPublishToken({ streamId, settings });
      webRTCAdaptor.publish(streamId, token);
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(getResponseError(error));
      leaveSession();
    }
  }

  onbeforeunload = () => {
    if (this.publisher) {
      this.publisher.dispose();
      this.publisher = undefined;
    }
  };

  publish(streamId: string) {
    const { initialized } = this.props;
    this.setState({ streamId });
    initialized && this.handlePublishing(streamId);
  }

  start() {
    const { initWebRTCAdaptor, initialized, publish_started } = this.props;
    const { streamId } = this.state;
    if (initialized && !publish_started && streamId) {
      this.handlePublishing(streamId);
    }

    initWebRTCAdaptor(this.handelWebRTCAdaptorCallback.bind(this));
  }

  handelWebRTCAdaptorCallback(info: WEBRTC_ADAPTOR_INFORMATIONS) {
    const { muteLocalMic, unmuteLocalMic } = this.props;
    if (info === WEBRTC_ADAPTOR_INFORMATIONS.PUBLISH_STARTED) {
      const player = videojs('publisher', {
        liveui: true,
        controls: true,
        muted: true,
        controlBar: {
          playToggle: false,
          currentTimeDisplay: false,
          fullscreenToggle: false,
          pictureInPictureToggle: false,
          volumePanel: false
        }
      });
      player.error(null);
      player.one('play', () => {
        this.publisher = player;
        // eslint-disable-next-line dot-notation
        this.publisher['webRTCMicControlsPlugin']({
          muteLocalMic,
          unmuteLocalMic,
          isMicMuted: false
        });
      });
    }
  }

  stop() {
    window.location.reload();
  }

  render() {
    const { initialized, publish_started } = this.props;
    const videoProps = {
      id: 'publisher',
      className: 'video-js',
      autoPlay: true,
      muted: true,
      controls: false,
      playsInline: true,
      style: { width: '100%' },
      hidden: !publish_started
    };
    return (
      <div style={{ minHeight: 300 }} className="text-center">
        {initialized && publish_started && (
          <Button type="default" onClick={this.stop.bind(this)} block className="mb-10">
            Stop Streaming
          </Button>
        )}
        <video {...videoProps} />
        {publish_started && <Badge status="success" text={<span className="badge-success publishing">Publishing</span>} />}
      </div>
    );
  }
}

export default withAntmedia(Publisher);
