/* eslint-disable dot-notation */
/* eslint-disable camelcase */
import * as React from 'react';
import classnames from 'classnames';
import fetch from 'isomorphic-unfetch';
import withAntMedia from 'src/antmedia';
import { streamService } from 'src/services';
import { StreamSettings } from 'src/interfaces';
import { WEBRTC_ADAPTOR_INFORMATIONS } from 'src/antmedia/constants';
import { WebRTCAdaptorConfigs } from 'src/antmedia/interfaces/WebRTCAdaptorConfigs';
import videojs from 'video.js';
import './index.less';

const DEFAULT_OFFLINE_IMAGE_URL = '/offline.png';

interface Props {
  participantId?: string;
  webRTCAdaptor: any;
  initWebRTCAdaptor: Function;
  publish_started: boolean;
  initialized: boolean;
  classNames?: any;
  settings: StreamSettings;
  configs: WebRTCAdaptorConfigs;
}

class Subscriber extends React.PureComponent<Props> {
  private streamId: string;

  private activeStreams = [];

  private getLiveStreamOrVodURLInterval: NodeJS.Timeout;

  componentDidMount() {
    window['player'] = videojs('subscriber', {
      autoplay: true,
      liveui: true,
      controls: true,
      controlBar: {
        volumePanel: {
          inline: false
        }
      }
    });
    window['player'].error(null);
    window['player'].on('ended', this.ended.bind(this));
    window['player'].on('error', this.ended.bind(this));
  }

  componentWillUnmount() {
    this.getLiveStreamOrVodURLInterval
      && clearInterval(this.getLiveStreamOrVodURLInterval);
    window['player'] && window['player'].dispose();
  }

  async handler(info: WEBRTC_ADAPTOR_INFORMATIONS, obj: any) {
    const { webRTCAdaptor, settings } = this.props;
    if (info === WEBRTC_ADAPTOR_INFORMATIONS.INITIALIZED) {
      const token = await streamService.getSubscriberToken({
        streamId: this.streamId,
        settings
      });
      webRTCAdaptor.play(this.streamId, token);
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.NEW_STREAM_AVAILABLE) {
      const activeStream = this.activeStreams.find((id) => id === obj.streamId);
      if (window['player']) {
        window['player'].dispose();
        window['player'] = undefined;
      }
      if (!activeStream) {
        this.activeStreams.push(obj.streamId);
        this.createRemoteVideo(obj.stream);
      }
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.PLAY_FINISHED) {
      this.activeStreams = this.activeStreams.filter(
        (id) => id !== obj.streamId
      );
      this.removeRemoteVideo();
      if (!window['player']) {
        this.createPlaybackideo();
        window['player'].poster(
          settings.defaultOfflineModelImage || DEFAULT_OFFLINE_IMAGE_URL
        );
      }
      setTimeout(() => {
        webRTCAdaptor.getStreamInfo(obj.streamId);
      }, 3000);
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.STREAM_INFORMATION) {
      if (obj.streamId === this.streamId) {
        const token = await streamService.getSubscriberToken({
          streamId: obj.streamId,
          settings
        });
        webRTCAdaptor.play(obj.streamId, token);
      }
    }
  }

  createPlaybackideo() {
    const video = document.createElement('video') as any;
    video.setAttribute('id', 'subscriber');
    video.setAttribute('class', 'video-js');
    video.autoplay = true;
    video.muted = true;
    video.controls = true;
    video.playsInline = true;
    document.querySelector('.video-container').append(video);
    window['player'] = videojs('subscriber', {
      autoplay: true,
      liveui: true,
      controls: true,
      controlBar: {
        volumePanel: {
          inline: false
        }
      }
    });
    window['player'].on('ended', this.ended.bind(this));
    window['player'].on('error', this.ended.bind(this));
    window['player'].controls(false);
  }

  resetPlaybackVideo() {
    this.streamId = '';
    if (window['player']?.src()) {
      window['player'].dispose();
      window['player'] = undefined;
      this.createPlaybackideo();
    }
  }

  async cbErrorHandler(error: string) {
    if (error === 'no_stream_exist') {
      const { webRTCAdaptor, initWebRTCAdaptor } = this.props;
      if (!webRTCAdaptor) {
        initWebRTCAdaptor(
          this.handler.bind(this),
          this.cbErrorHandler.bind(this)
        );
      } else {
        this.streamId && webRTCAdaptor.getStreamInfo(this.streamId);
      }
    }
  }

  async ended() {
    window['player'] && window['player'].error(null);
    const { settings } = this.props;
    if (!this.streamId) {
      return;
    }

    const src = await streamService.getLiveStreamOrVodURL({
      streamId: this.streamId,
      settings,
      appName: settings.AntMediaAppname
    });
    if (src) {
      this.getLiveStreamOrVodURLInterval = setInterval(() => {
        fetch(src, { method: 'HEAD' }).then(() => {
          this.playHLS(this.streamId);
          this.getLiveStreamOrVodURLInterval
            && clearInterval(this.getLiveStreamOrVodURLInterval);
        });
      }, 5000);
    }
  }

  createRemoteVideo(stream: any) {
    const video = document.createElement('video') as any;
    video.setAttribute('id', 'subscriber');
    video.setAttribute('class', 'video-js');
    video.autoplay = true;
    video.muted = true;
    video.controls = true;
    video.playsInline = true;
    video.srcObject = stream;
    document.querySelector('.video-container').append(video);
  }

  removeRemoteVideo() {
    const video = document.getElementById('subscriber') as HTMLVideoElement;
    if (video) {
      video.srcObject = null;
      document.querySelector('.video-container').removeChild(video);
    }
  }

  async play(streamId: string) {
    const {
      initWebRTCAdaptor, initialized, webRTCAdaptor, settings
    } = this.props;
    this.streamId = streamId;
    if (initialized) {
      const token = await streamService.getSubscriberToken({
        streamId,
        settings
      });
      webRTCAdaptor.play(streamId, token);
      return;
    }

    initWebRTCAdaptor(this.handler.bind(this), this.cbErrorHandler.bind(this));
  }

  async playHLS(streamId: string) {
    const { configs, settings } = this.props;
    const appName = configs.appName || settings.AntMediaAppname;
    this.streamId = streamId;
    this.getLiveStreamOrVodURLInterval
      && clearInterval(this.getLiveStreamOrVodURLInterval);
    const src = await streamService.getLiveStreamOrVodURL({
      appName,
      settings,
      streamId
    });
    if (!src) {
      return;
    }

    if (!window['player']) {
      window['player'] = videojs('subscriber', {
        autoplay: true,
        liveui: true,
        controls: true,
        controlBar: {
          volumePanel: {
            inline: false
          }
        }
      });
      window['player'].on('ended', this.ended.bind(this));
      window['player'].on('error', this.ended.bind(this));
    }
    // window['player'].addClass('vjs-waiting');

    setTimeout(() => {
      if (!window['player']) return;
      window['player'].src({
        type: 'application/x-mpegURL',
        src
      });
      window['player'].play();
      window['player'].controls(true);
    }, 1 * 1000);
  }

  stop() {
    this.streamId = '';
  }

  render() {
    const { classNames } = this.props;
    const videoProps = {
      id: 'subscriber',
      controls: true,
      className: classnames('video-js', classNames),
      autoPlay: true,
      muted: true,
      playsInline: true,
      width: '100%'
    };
    return (
      <div className="video-container">
        <video {...videoProps} />
      </div>
    );
  }
}

export default withAntMedia(Subscriber);
