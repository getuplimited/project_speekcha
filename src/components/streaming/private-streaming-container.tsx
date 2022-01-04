/* eslint-disable dot-notation */
/* eslint-disable camelcase */
import React, { PureComponent } from 'react';
import withAntmedia from 'src/antmedia';
import { Button, message } from 'antd';
import Router from 'next/router';
import { WEBRTC_ADAPTOR_INFORMATIONS } from 'src/antmedia/constants';
import { SocketContext } from 'src/socket';
import { IPerformer, StreamSettings } from 'src/interfaces';
import { streamService } from 'src/services';
import { WebRTCAdaptorConfigs } from 'src/antmedia/interfaces/WebRTCAdaptorConfigs';
import videojs from 'video.js';
import classnames from 'classnames';
import MicControlsPlugin from 'src/videojs/mic-controls/plugin';

import './private-streaming-container.less';

const STREAM_JOINED = 'private-stream/streamJoined';
const STREAM_LEAVED = 'private-stream/streamLeaved';
const JOINED_THE_ROOM = 'JOINED_THE_ROOM';

interface IProps {
  sessionId: string;
  containerClassName: string;
  participantId: string;
  role_data?: 'performer' | 'user';
  performer?: IPerformer;
  controller?: boolean;
  onChange?: Function;
  publish_started: boolean;
  processing?: boolean;
  initialized?: boolean;
  initWebRTCAdaptor: Function;
  leaveSession: Function;
  muteLocalMic: Function;
  unmuteLocalMic: Function;
  onClick?: Function;
  btnText?: string;
  settings?: StreamSettings;
  webRTCAdaptor: any;
  configs: Partial<WebRTCAdaptorConfigs>;
}

interface IState {
  sessionId: string;
  conversationId: string;
  streamId: string;
  loading: boolean;
}

class PrivateStreamingContainer extends PureComponent<IProps, IState> {
  private activeStreams = [];

  private socket: any;

  private getLiveStreamOrVodURLInterval: NodeJS.Timeout;

  private publisher: videojs.Player;

  private player: videojs.Player;

  constructor(props) {
    super(props);
    this.state = {
      sessionId: null,
      streamId: null,
      conversationId: null,
      loading: false
    };
  }

  componentDidMount() {
    this.socket = this.context;
    videojs.registerPlugin('webRTCMicControlsPlugin', MicControlsPlugin);
    Router.events.on('routeChangeStart', this.onbeforeunload);
    window.addEventListener('beforeunload', this.onbeforeunload);
  }

  componentDidUpdate(prevProps: IProps, prevStates: IState) {
    const { processing } = this.props;
    const { conversationId } = this.state;
    if (prevProps.processing !== processing) {
      this.handleLoading(processing);
    }

    if (conversationId && conversationId !== prevStates.conversationId) {
      this.initSocketEvent();
    }
  }

  componentWillUnmount() {
    Router.events.off('routeChangeStart', this.onbeforeunload);
    window.removeEventListener('beforeunload', this.onbeforeunload);
  }

  handleLoading(v: boolean) {
    this.setState({ loading: v });
  }

  onbeforeunload = () => {
    this.leaveStream();
  };

  async handelWebRTCAdaptorCallback(
    info: WEBRTC_ADAPTOR_INFORMATIONS,
    obj: any
  ) {
    const { sessionId, conversationId, streamId } = this.state;
    const { settings, webRTCAdaptor } = this.props;
    this.socket = this.context;
    if (info === WEBRTC_ADAPTOR_INFORMATIONS.INITIALIZED) {
      if (settings.optionForPrivate === 'hls') {
        const token = await streamService.getPublishToken({
          streamId,
          settings
        });
        webRTCAdaptor.publish(streamId, token);
      }

      webRTCAdaptor.joinRoom(conversationId, streamId);
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.NEW_STREAM_AVAILABLE) {
      const activeStream = this.activeStreams.find((id) => id === obj.streamId);
      if (!activeStream) {
        this.activeStreams.push(obj.streamId);
        this.createRemoteVideo(obj.stream);
      }
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.JOINED_THE_ROOM) {
      if (settings.optionForPrivate === 'webrtc') {
        const token = await streamService.getPublishToken({
          streamId,
          settings
        });
        webRTCAdaptor.publish(streamId, token);
      }
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.PUBLISH_STARTED) {
      const { muteLocalMic, unmuteLocalMic } = this.props;
      const player = videojs('private-publisher', {
        liveui: true,
        controls: true,
        muted: true,
        bigPlayButton: false,
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
      this.socket.emit('private-stream/join', {
        conversationId,
        streamId: obj.streamId,
        sessionId
      });
      this.setState({ loading: false });
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.PUBLISH_FINISHED) {
      this.socket.emit('private-stream/leave', {
        conversationId,
        streamId: obj.streamId,
        sessionId
      });
      this.setState({ loading: false });
    }
  }

  initSocketEvent() {
    const { initWebRTCAdaptor, role_data, performer } = this.props;
    this.socket = this.context;
    this.socket.on(
      JOINED_THE_ROOM,
      ({ streamId, streamList, conversationId: _id }) => {
        const { conversationId } = this.state;
        if (_id !== conversationId) return;

        this.setState({ streamId });
        initWebRTCAdaptor(this.handelWebRTCAdaptorCallback.bind(this));
        if (streamList.length) {
          this.subscribeHLS(streamList[0]);
        }
      }
    );
    this.socket.on(
      STREAM_JOINED,
      (data: { streamId: string; conversationId: string }) => {
        const { streamId, conversationId } = this.state;
        if (conversationId !== data.conversationId) return;

        if (streamId !== data.streamId) {
          this.subscribeHLS(data.streamId);
        }
      }
    );
    this.socket.on(
      STREAM_LEAVED,
      (data: { streamId: string; conversationId: string }) => {
        const { conversationId, streamId } = this.state;
        if (
          !conversationId
          || conversationId !== data.conversationId
          || streamId === data.streamId
        ) return;

        message.error('Private call has ended.');
        window.setTimeout(() => {
          if (role_data === 'performer') {
            Router.push('/live');
          } else if (role_data === 'user') {
            Router.push(
              {
                pathname: '/stream',
                query: { performer: JSON.stringify(performer) }
              },
              `/profile/${performer.username}`
            );
          } else {
            Router.push('/');
          }
        }, 10 * 1000);
      }
    );

    Router.events.on('routeChangeStart', this.onbeforeunload.bind(this));
    window.addEventListener('beforeunload', this.onbeforeunload.bind(this));
  }

  start(sessionId: string, conversationId: string) {
    this.setState({ sessionId, conversationId });
  }

  leaveStream() {
    const { publish_started, webRTCAdaptor } = this.props;
    const { sessionId, conversationId, streamId } = this.state;
    if (this.publisher) {
      this.publisher.dispose();
      this.publisher = undefined;
    }
    if (this.player) {
      this.player.dispose();
      this.player = undefined;
    }
    this.getLiveStreamOrVodURLInterval
      && clearInterval(this.getLiveStreamOrVodURLInterval);
    this.socket.off(JOINED_THE_ROOM);
    this.socket.off(STREAM_JOINED);
    this.socket.off(STREAM_LEAVED);
    if (streamId && publish_started) {
      webRTCAdaptor && webRTCAdaptor.leaveFromRoom(conversationId);
      this.socket.emit('private-stream/leave', {
        conversationId,
        streamId,
        sessionId
      });
    }

    this.setState({
      streamId: null,
      sessionId: null,
      conversationId: null
    });
  }

  async ended(streamId: string) {
    this.player && this.player.error(null);
    const { settings } = this.props;
    const src = await streamService.getLiveStreamOrVodURL({
      streamId,
      settings,
      appName: settings.AntMediaAppname
    });
    if (src) {
      this.getLiveStreamOrVodURLInterval = setInterval(() => {
        fetch(src, { method: 'HEAD' }).then(() => {
          this.subscribeHLS(streamId);
          this.getLiveStreamOrVodURLInterval
            && clearInterval(this.getLiveStreamOrVodURLInterval);
        });
      }, 5000);
    }
  }

  async subscribeHLS(streamId: string) {
    const { settings, configs } = this.props;
    const appName = configs.appName || settings.AntMediaAppname;
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

    let video = document.querySelector('#private-subscriber');
    if (!video) {
      video = document.createElement('video');
      video.setAttribute('id', 'private-subscriber');
      video.setAttribute('class', 'video-js vjs-waiting');
      video.setAttribute('autoplay', 'autoplay');
      video.setAttribute('data-setup', '{"fluid": true}');
      document.querySelector('.private-streaming-container').append(video);
    }

    if (!this.player) {
      this.player = videojs('private-subscriber', {
        liveui: true,
        controls: true,
        autoplay: true
      });
      this.player.on('ended', () => this.ended(streamId));
      this.player.on('error', () => this.ended(streamId));
    }

    setTimeout(() => {
      if (!this.player) return;
      this.player.src({
        type: 'application/x-mpegURL',
        src
      });
    }, 10 * 1000);
  }

  createRemoteVideo(stream: any) {
    const video = document.createElement('video');
    video.setAttribute('id', 'private-subscriber');
    video.setAttribute('class', 'video-js');
    video.setAttribute('autoplay', 'autoplay');
    video.setAttribute('controls', 'controls');
    video.srcObject = stream;
    document.querySelector('.private-streaming-container').append(video);
    // video.oncanplay = (() => {
    //   window['player'] = videojs('private-subscriber', {
    //     liveui: true,
    //     controls: true
    //   });
    // });
  }

  removeRemoteVideo() {
    const video = document.getElementById(
      'private-subscriber'
    ) as HTMLVideoElement;
    if (video) {
      video.srcObject = null;
      // window['player'] && window['player'].dispose();
      document.querySelector('.private-streaming-container').removeChild(video);
    }
  }

  leave() {
    if (process.browser) {
      this.leaveStream();
      setTimeout(() => {
        window.location.href = '/';
      }, 10 * 1000);
    }
  }

  stop() {
    const { leaveSession } = this.props;
    leaveSession();
  }

  async play(streamId: string) {
    const { settings, webRTCAdaptor } = this.props;
    const token = await streamService.getSubscriberToken({
      streamId,
      settings
    });
    webRTCAdaptor.play(streamId, token);
  }

  render() {
    const {
      onClick,
      btnText,
      initialized,
      containerClassName,
      publish_started
    } = this.props;
    const { loading } = this.state;
    return (
      <>
        <div
          className={classnames(
            'private-streaming-container containerClassName',
            containerClassName
          )}
        >
          <video
            id="private-publisher"
            controls
            className="video-js"
            autoPlay
            muted
            playsInline
            hidden={!publish_started}
          />
          {/* <video id="private-subscriber" playsInline autoPlay controls /> */}
        </div>
        <div>
          {!initialized ? (
            <Button
              type="primary"
              onClick={() => onClick()}
              loading={loading}
              block
            >
              {btnText || 'Start Streaming'}
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={this.leave.bind(this)}
              block
              disabled={loading}
            >
              Stop Streaming
            </Button>
          )}
        </div>
      </>
    );
  }
}

PrivateStreamingContainer.contextType = SocketContext;
export default withAntmedia(PrivateStreamingContainer);
