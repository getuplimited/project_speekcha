/* eslint-disable dot-notation */
/* eslint-disable camelcase */
import * as React from 'react';
import { StreamSettings } from 'src/interfaces';
import { streamService } from 'src/services';
import classnames from 'classnames';
import withAntMedia from 'src/antmedia';
import { WEBRTC_ADAPTOR_INFORMATIONS } from 'src/antmedia/constants';
import './index.less';

interface Props {
  participantId?: string;
  webRTCAdaptor: any;
  initWebRTCAdaptor: Function;
  publish_started: boolean;
  initialized: boolean;
  classNames?: any;
  leaveSession: Function;
  settings: StreamSettings;
}

class Subscriber extends React.PureComponent<Props> {
  private streamId: string;

  private availableStreamIds = [];

  async handler(info: WEBRTC_ADAPTOR_INFORMATIONS, obj: any) {
    const { webRTCAdaptor, settings } = this.props;
    if (info === WEBRTC_ADAPTOR_INFORMATIONS.INITIALIZED) {
      const token = await streamService.getSubscriberToken({ streamId: this.streamId, settings });
      webRTCAdaptor.play(this.streamId, token);
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.NEW_STREAM_AVAILABLE) {
      const activeStream = this.availableStreamIds.find((id) => id === obj.streamId);
      if (!activeStream) {
        this.availableStreamIds.push(obj.streamId);
        this.createRemoteVideo(obj.stream);
      }
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.PLAY_FINISHED) {
      this.availableStreamIds = this.availableStreamIds.filter((id) => id !== obj.streamId);
      this.removeRemoteVideo();
      setTimeout(() => {
        webRTCAdaptor.getStreamInfo(obj.streamId);
      }, 3000);
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.STREAM_INFORMATION) {
      if (obj.streamId === this.streamId) {
        const token = await streamService.getSubscriberToken({ streamId: obj.streamId, settings });
        webRTCAdaptor.play(obj.streamId, token);
      }
    }
  }

  async cbErrorHandler(error: string) {
    if (error === 'no_stream_exist') {
      const { webRTCAdaptor, initWebRTCAdaptor } = this.props;
      if (!webRTCAdaptor) {
        initWebRTCAdaptor(this.handler.bind(this), this.cbErrorHandler.bind(this));
      } else {
        this.streamId && webRTCAdaptor.getStreamInfo(this.streamId);
      }
    }
  }

  createRemoteVideo(stream: any) {
    const { classNames } = this.props;
    const video = document.createElement('video') as any;
    video.setAttribute('id', 'private-subscriber');
    video.setAttribute('class', classnames('video-js', classNames));
    video.autoplay = true;
    video.muted = true;
    video.controls = true;
    video.playsInline = true;
    video.srcObject = stream;
    document.querySelector('.private-streaming-container').append(video);
  }

  removeRemoteVideo() {
    const video = document.getElementById('private-subscriber') as HTMLVideoElement;
    if (video) {
      video.srcObject = null;
      document.querySelector('.private-streaming-container').removeChild(video);
    }
  }

  async play(streamId: string) {
    const {
      initWebRTCAdaptor, initialized, webRTCAdaptor, settings
    } = this.props;
    this.streamId = streamId;
    if (initialized) {
      const token = await streamService.getSubscriberToken({ streamId, settings });
      webRTCAdaptor.play(streamId, token);
      return;
    }

    initWebRTCAdaptor(this.handler.bind(this), this.cbErrorHandler.bind(this));
  }

  close() {
    this.streamId = null;
  }

  stop() {
    const { leaveSession } = this.props;
    this.streamId = '';
    this.availableStreamIds = [];
    leaveSession && leaveSession();
  }

  render() {
    return (
      <></>
    );
  }
}

export default withAntMedia(Subscriber);
