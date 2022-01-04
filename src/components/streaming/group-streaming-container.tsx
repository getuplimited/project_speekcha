/* eslint-disable dot-notation */
/* eslint-disable camelcase */
import React, { PureComponent } from 'react';
import withAntmedia from 'src/antmedia';
import { Button, message } from 'antd';
import Router from 'next/router';
import { StreamSettings } from 'src/interfaces';
import { SocketContext } from 'src/socket';
import { WEBRTC_ADAPTOR_INFORMATIONS } from 'src/antmedia/constants';
import { streamService } from 'src/services';
import { getResponseError } from '@lib/utils';
import { WebRTCAdaptorConfigs } from 'src/antmedia/interfaces/WebRTCAdaptorConfigs';
import videojs from 'video.js';
import './group-streaming-container.less';
import MicControlsPlugin from 'src/videojs/mic-controls/plugin';

const STREAM_JOINED = 'private-stream/streamJoined';
const STREAM_LEAVED = 'private-stream/streamLeaved';
const JOINED_THE_ROOM = 'JOINED_THE_ROOM';

interface IProps {
  sessionId: string;
  participantId: string;
  controller?: boolean;
  onChange?: Function;
  publish_started: boolean;
  initialized?: boolean;
  initWebRTCAdaptor: Function;
  leaveSession: Function;
  muteLocalMic: Function;
  unmuteLocalMic: Function;
  processing?: boolean;
  onClick?: Function;
  btnText?: string;
  settings?: StreamSettings;
  webRTCAdaptor: any;
  configs: Partial<WebRTCAdaptorConfigs>;
}

interface IState {
  streamId: string;
  streamList: string[];
  sessionId: string;
  conversationId: string;
  loading: boolean;
}

class GroupStreamingContainer extends PureComponent<IProps, IState> {
  private socket;

  private publisher: videojs.Player;

  private players: Record<string, videojs.Player> = {};

  private getLiveStreamOrVodURLInterval: Record<string, NodeJS.Timeout> = {};

  constructor(props: IProps) {
    super(props);
    this.state = {
      sessionId: null, // roomName
      streamId: null,
      streamList: [],
      conversationId: null,
      loading: false
    };
  }

  componentDidMount() {
    videojs.registerPlugin('webRTCMicControlsPlugin', MicControlsPlugin);
    const { initWebRTCAdaptor } = this.props;
    this.socket = this.context;
    this.socket.on(JOINED_THE_ROOM, (data) => {
      const { streamId, streamList, conversationId: _id } = data;
      const { conversationId } = this.state;
      if (_id !== conversationId) return;

      this.setState({ streamId, streamList });
      initWebRTCAdaptor(this.handelWebRTCAdaptorCallback.bind(this));
      if (streamList.length) {
        streamList.forEach((id: string) => {
          const player = document.createElement('video');
          const container = document.getElementById('group-video-container');
          player.setAttribute('id', id);
          player.setAttribute('class', 'video-js');
          player.setAttribute('autoplay', 'autoplay');
          container.append(player);
          this.players[`player_${id}`] = videojs(
            id,
            {
              height: 100,
              width: container.offsetWidth / 4,
              controls: true,
              controlBar: {
                playToggle: false,
                liveDisplay: false
              }
            },
            () => this.onReadyCallback(id)
          );
          this.players[`player_${id}`].error(null);
        });
      }
    });

    this.socket.on(
      STREAM_LEAVED,
      (data: { streamId: string; conversationId: string }) => {
        const { conversationId, streamId, streamList } = this.state;
        if (
          conversationId !== data.conversationId
          || streamId === data.streamId
        ) return;
        this.setState({
          streamList: streamList.filter((id) => id !== data.streamId)
        });
        if (this.players[`player_${data.streamId}`]) {
          this.players[`player_${data.streamId}`].dispose();
          delete this.players[`player_${data.streamId}`];
        }
      }
    );

    this.socket.on(
      STREAM_JOINED,
      (data: { streamId: string; conversationId: string }) => {
        const { streamList, streamId, conversationId } = this.state;
        if (conversationId !== data.conversationId) return;
        if (streamId !== data.streamId) {
          this.setState({ streamList: [...streamList, data.streamId] });
          const player = document.createElement('video');
          const container = document.getElementById('group-video-container');
          player.setAttribute('id', data.streamId);
          player.setAttribute('class', 'video-js');
          player.setAttribute('autoplay', 'autoplay');
          container.append(player);
          this.players[`player_${data.streamId}`] = videojs(
            data.streamId,
            {
              height: 100,
              width: container.offsetWidth / 4,
              muted: data.streamId === streamId,
              controls: true,
              controlBar: {
                playToggle: false,
                liveDisplay: false
              }
            },
            () => this.onReadyCallback(data.streamId)
          );
        }
      }
    );
    Router.events.on('routeChangeStart', this.onbeforeunload.bind(this));
    window.addEventListener('beforeunload', this.onbeforeunload.bind(this));
  }

  componentDidUpdate(prevProps: IProps) {
    const { processing } = this.props;
    if (prevProps.processing !== processing) {
      this.handleLoading(processing);
    }
  }

  handleLoading(v: boolean) {
    this.setState({ loading: v });
  }

  onbeforeunload() {
    this.leaveStream();
  }

  async onReadyCallback(streamId: string, isPublisher = false) {
    if (isPublisher) {
      this.publisher.on('click', (event) => {
        if (event.target.classList.contains('vjs-has-started')) {
          this.subscribeHLS(streamId);
        }
      });
      return;
    }

    try {
      const { settings, configs } = this.props;
      const appName = configs.appName || settings.AntMediaAppname;
      const src = await streamService.getLiveStreamOrVodURL({
        appName,
        settings,
        streamId
      });
      if (!src) {
        return;
      }

      this.players[`player_${streamId}`].on('click', (event) => {
        if (event.target.classList.contains('vjs-has-started')) {
          this.subscribeHLS(streamId);
        }
      });
      this.players[`player_${streamId}`].addClass('vjs-waiting');
      this.players[`player_${streamId}`].on('ended', () => this.ended(streamId));
      this.players[`player_${streamId}`].on('error', () => this.ended(streamId));

      setTimeout(() => {
        if (!this.players[`player_${streamId}`]) return;
        this.players[`player_${streamId}`].src({
          type: 'application/x-mpegURL',
          src
        });
        this.players[`player_${streamId}`].play();
      }, 10 * 1000);
    } catch (err) {
      const error = await Promise.resolve(err);
      message.error(getResponseError(error));
    }
  }

  async handelWebRTCAdaptorCallback(info: WEBRTC_ADAPTOR_INFORMATIONS, obj: any) {
    const { webRTCAdaptor, settings } = this.props;
    const { sessionId, conversationId, streamId } = this.state;
    if (info === WEBRTC_ADAPTOR_INFORMATIONS.INITIALIZED) {
      const token = await streamService.getPublishToken({ streamId, settings });
      webRTCAdaptor.publish(streamId, token);
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.PUBLISH_STARTED) {
      const { muteLocalMic, unmuteLocalMic } = this.props;
      const container = document.getElementById('group-video-container');
      const player = videojs('localVideoId', {
        liveui: true,
        controls: true,
        muted: true,
        height: 100,
        width: container.offsetWidth / 4,
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
        this.onReadyCallback(obj.streamId, true);
      });
      this.socket.emit('private-stream/join', {
        conversationId,
        streamId: obj.streamId,
        sessionId
      });
      this.setState({ loading: false });
    } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.PUBLISH_FINISHED) {
      if (this.publisher) {
        this.publisher.dispose();
        this.publisher = undefined;
      }

      this.socket.emit('private-stream/leave', {
        conversationId,
        streamId: obj.streamId,
        sessionId
      });
      this.setState({ loading: false });
    }
  }

  async subscribeHLS(streamId: string) {
    try {
      const { settings, configs } = this.props;
      const appName = configs.appName || settings.AntMediaAppname;
      this.getLiveStreamOrVodURLInterval[streamId]
        && clearInterval(this.getLiveStreamOrVodURLInterval[streamId]);
      const src = await streamService.getLiveStreamOrVodURL({
        appName,
        settings,
        streamId
      });
      if (!src) {
        return;
      }

      let video = document.querySelector('#main-group-video');
      if (!video) {
        video = document.createElement('video');
        video.setAttribute('id', 'main-group-video');
        video.setAttribute('class', 'video-js');
        video.setAttribute('autoplay', 'autoplay');
        video.setAttribute('mute', 'mute');
        document.querySelector('.stream-group').prepend(video);
      }

      if (!window['mainPlayer']) {
        window['mainPlayer'] = videojs('main-group-video', {
          muted: true,
          liveui: true,
          controls: true
        });
        window['mainPlayer'].on('ended', () => window['mainPlayer'].reset());
      }

      setTimeout(() => {
        if (!window['mainPlayer']) return;
        window['mainPlayer'].src({
          type: 'application/x-mpegURL',
          src
        });
        window['mainPlayer'].play();
      }, 1000);
    } catch (err) {
      const error = await Promise.resolve(err);
      message.error(getResponseError(error));
    }
  }

  start(sessionId: string, conversationId: string) {
    this.setState({ sessionId, conversationId });
  }

  leaveStream() {
    const { publish_started } = this.props;
    const { sessionId, conversationId, streamId } = this.state;
    Object.keys(this.getLiveStreamOrVodURLInterval).forEach((id) => {
      clearInterval(this.getLiveStreamOrVodURLInterval[id]);
      delete this.getLiveStreamOrVodURLInterval[id];
    });
    if (this.publisher) {
      this.publisher.dispose();
      this.publisher = undefined;
    }
    Object.keys(this.players).forEach((id) => {
      if (this.players[id]) {
        this.players[id].dispose();
        this.players[id] = undefined;
      }
    });
    this.socket.off(JOINED_THE_ROOM);
    this.socket.off(STREAM_JOINED);
    this.socket.off(STREAM_LEAVED);
    if (streamId && publish_started) {
      this.socket.emit('private-stream/leave', {
        conversationId,
        streamId,
        sessionId
      });
    }

    this.setState({
      sessionId: null,
      streamId: null,
      streamList: [],
      conversationId: null
    });
  }

  async ended(streamId: string) {
    this.players[`player_${streamId}`].error(null);
    const { settings } = this.props;
    const src = await streamService.getLiveStreamOrVodURL({
      streamId,
      settings,
      appName: settings.AntMediaAppname
    });
    if (src) {
      this.getLiveStreamOrVodURLInterval[streamId] = setInterval(() => {
        fetch(src, { method: 'HEAD' }).then(() => {
          if (this.players[`player_${streamId}`]) {
            this.players[`player_${streamId}`].src({
              type: 'application/x-mpegURL',
              src
            });
            this.players[`player_${streamId}`].play();
          }
          this.getLiveStreamOrVodURLInterval[streamId]
            && clearInterval(this.getLiveStreamOrVodURLInterval[streamId]);
        });
      }, 5000);
    }
  }

  leave() {
    if (process.browser) {
      window.location.reload();
    }
  }

  stop() {
    const { leaveSession } = this.props;
    leaveSession();
  }

  render() {
    const {
      onClick, btnText, initialized, publish_started
    } = this.props;
    const { loading } = this.state;

    return (
      <>
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
        <div style={{ position: 'relative' }} className="stream-group">
          <div id="group-video-container">
            <video
              id="localVideoId"
              className="video-js"
              hidden={!publish_started}
              muted
              controls
              autoPlay
              playsInline
            />
          </div>
        </div>
      </>
    );
  }
}

GroupStreamingContainer.contextType = SocketContext;
export default withAntmedia(GroupStreamingContainer);
