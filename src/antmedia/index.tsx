/* eslint-disable dot-notation */
/* eslint-disable camelcase */
import React from 'react';
import Router from 'next/router';
// import { connect } from 'react-redux';
import { IPerformer, StreamSettings } from 'src/interfaces';
import { SETTING_KEYS } from 'src/constants';
import { message as _message } from 'antd';
import env from '../env';
import { WEBRTC_ADAPTOR_INFORMATIONS } from './constants';
import { WebRTCAdaptorConfigs } from './interfaces/WebRTCAdaptorConfigs';

interface IProps {
  token?: string;
  callback?: (info: WEBRTC_ADAPTOR_INFORMATIONS, obj: any) => void;
  sessionId?: string; // streamName
  configs: Partial<WebRTCAdaptorConfigs>;
  participantId?: string;
  role_data?: 'performer' | 'user';
  performer?: IPerformer;
  className?: string;
  classNames?: string;
  containerClassName?: string;
  id?: string;
  forwardedRef?: any;
  onChange?: Function;
  initImmediately?: boolean;
  autoRepublishDisabled?: boolean;
  onClick?: Function;
  btnText?: string;
  processing?: boolean;
  settings: StreamSettings;
}

interface States {
  initialized: boolean;
  publish_started: boolean;
  isMicMuted: boolean;
  iceConnectionState?: 'disconnected' | 'connected' | 'checking';
  streamId?: string;
  cb?: Function;
  cbError?: Function;
}

export default function withAntmedia(Component) {
  class AntMediaComponent extends React.Component<IProps, States> {
    private webRTCAdaptor;

    static async getInitialProps(ctx) {
      const pageProps = Component.getInitialProps && (await Component.getInitialProps(ctx));
      // Return props.
      return { ...pageProps };
    }

    private autoRepublishIntervalJob: NodeJS.Timeout;

    constructor(props) {
      super(props);
      const { sessionId } = this.props;
      this.state = {
        initialized: false,
        publish_started: false,
        isMicMuted: false,
        streamId: sessionId
      };
    }

    componentDidMount() {
      const { initImmediately } = this.props;
      initImmediately && this.initWebRTCAdaptor();
      Router.events.on('routeChangeStart', this.onbeforeunload);
      // window.addEventListener('beforeunload', this.onbeforeunload);
    }

    componentWillUnmount() {
      Router.events.off('routeChangeStart', this.onbeforeunload);
      // window.removeEventListener('beforeunload', this.onbeforeunload);
    }

    onbeforeunload = () => {
      this.leaveSession();
    };

    leaveSession() {
      const { streamId, initialized } = this.state;
      const {
        configs: { isPlayMode }
      } = this.props;
      if (this.autoRepublishIntervalJob) {
        window.clearInterval(this.autoRepublishIntervalJob);
      }

      if (this.webRTCAdaptor) {
        if (streamId) {
          this.webRTCAdaptor.stop(streamId);
          this.webRTCAdaptor.closePeerConnection(streamId);
          if (!isPlayMode) {
            this.webRTCAdaptor.closeStream(streamId);
          }
        }
        if (initialized) {
          this.webRTCAdaptor.closeWebSocket();
        }
        this.webRTCAdaptor = undefined;
      }

      this.setState({
        streamId: '',
        initialized: false,
        isMicMuted: false
      });
    }

    initWebRTCAdaptor(cb?: Function, cbError?: Function) {
      const {
        configs, settings, autoRepublishDisabled, callback
      } = this.props;
      const { isPlayMode } = configs;
      const { debug } = env;
      const publisherURL = isPlayMode
        ? settings[SETTING_KEYS.SUBSCRIBER_URL]
        : settings[SETTING_KEYS.PUBLISHER_URL];
      if (!publisherURL) {
        _message.error('Undefined WebsocketURL!');
        return;
      }

      if (!this.webRTCAdaptor && autoRepublishDisabled) return;

      const pc_config = {
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302'
          }
        ]
      };

      const sdpConstraints = {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: false
      };

      const mediaConstraints = {
        video: true,
        audio: true
      };

      const appName = configs.appName || settings.AntMediaAppname;
      const path = `${publisherURL}/${appName}/websocket`;

      let websocketURL = `ws://${path}`;

      if (window.location.protocol.startsWith('https')) {
        websocketURL = `wss://${path}`;
      }

      this.setState({ cb, cbError });
      this.webRTCAdaptor = new window['WebRTCAdaptor']({
        websocket_url: websocketURL,
        mediaConstraints,
        debug,
        peerconnection_config: pc_config,
        sdp_constraints: sdpConstraints,
        bandwidth: env.maxVideoBitrateKbps,
        isPlayMode: false,
        ...configs,
        callback: (info: WEBRTC_ADAPTOR_INFORMATIONS, obj: any) => {
          if (info === 'initialized') {
            this.setState({ initialized: true });
          } else if (info === 'publish_started') {
            this.setState({
              publish_started: true,
              streamId: obj.streamId
            });
            if (!this.autoRepublishIntervalJob && !autoRepublishDisabled) {
              this.autoRepublishIntervalJob = setInterval(
                this.checkAndRepublishIfRequired.bind(this),
                5000
              );
            }
          } else if (info === 'publish_finished') {
            this.setState({ publish_started: false, streamId: '' });
            // if (this.autoRepublishIntervalJob) {
            //   window.clearInterval(this.autoRepublishIntervalJob);
            // }
          } else if (
            info === WEBRTC_ADAPTOR_INFORMATIONS.ICE_CONNECTION_STATE_CHANGED
          ) {
            this.setState({
              iceConnectionState: obj.state
            });
          } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.REFRESH_CONNECTION) {
            const { publish_started } = this.state;
            if (publish_started && !autoRepublishDisabled) {
              this.checkAndRepublishIfRequired();
            }
          } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.CLOSED) {
            // this.leaveSession();
            if (typeof obj !== 'undefined') {
              // eslint-disable-next-line no-console
              console.log(`Connecton closed: ${JSON.stringify(obj)}`);
            }
          }

          callback && typeof callback === 'function' && callback(info, obj); // props
          cb && typeof cb === 'function' && cb(info, obj); // param
        },
        callbackError: (error, message) => {
          cbError && typeof cbError === 'function' && cbError(error, message);
          this.callbackError(error, message, { websocketURL });
        }
      });
    }

    checkAndRepublishIfRequired() {
      try {
        const { streamId, cb, cbError } = this.state;
        if (!this.webRTCAdaptor || !streamId) return;

        const iceState = this.webRTCAdaptor.iceConnectionState(streamId);
        if (
          iceState == null
        || iceState === 'failed'
        || iceState === 'disconnected'
        ) {
          // eslint-disable-next-line no-console
          console.error('Publish has stopped and will try to re-publish');
          this.webRTCAdaptor.stop(streamId);
          this.webRTCAdaptor.closePeerConnection(streamId);
          this.webRTCAdaptor.closeWebSocket();
          this.initWebRTCAdaptor(cb, cbError);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('error republish', e);
      }
    }

    callbackError(error, message, options) {
      // some of the possible errors, NotFoundError, SecurityError,PermissionDeniedError
      // eslint-disable-next-line no-console
      console.error(`error callback: ${JSON.stringify(error)}`);
      const { websocketURL } = options;
      if (typeof message === 'string') {
        // eslint-disable-next-line no-console
        console.error('error message:', message);
        _message.error(message, 3);
        return;
      }

      let errorMessage = JSON.stringify(error);
      if (errorMessage.indexOf('noStreamNameSpecified') !== -1) {
        // eslint-disable-next-line no-console
        console.warn(errorMessage);
        return;
      }

      if (errorMessage.indexOf('NotFoundError') !== -1) {
        errorMessage = 'Camera or Mic are not found or not allowed in your device';
      } else if (
        errorMessage.indexOf('NotReadableError') !== -1
        || errorMessage.indexOf('TrackStartError') !== -1
      ) {
        errorMessage = 'Camera or Mic is being used by some other process that does not let read the devices';
      } else if (
        errorMessage.indexOf('OverconstrainedError') !== -1
        || errorMessage.indexOf('ConstraintNotSatisfiedError') !== -1
      ) {
        errorMessage = 'There is no device found that fits your video and audio constraints. You may change video and audio constraints';
      } else if (
        errorMessage.indexOf('NotAllowedError') !== -1
        || errorMessage.indexOf('PermissionDeniedError') !== -1
      ) {
        errorMessage = 'You are not allowed to access camera and mic.';
      } else if (errorMessage.indexOf('TypeError') !== -1) {
        errorMessage = 'Video/Audio is required';
      } else if (errorMessage.indexOf('ScreenSharePermissionDenied') !== -1) {
        errorMessage = 'You are not allowed to access screen share';
      } else if (errorMessage.indexOf('WebSocketNotConnected') !== -1) {
        errorMessage = 'WebRTCAdaptor Connection is disconnected';
      } else if (errorMessage.indexOf('unauthorized_access') !== -1) {
        errorMessage = 'Access Denied. You don’t have permission to access';
      } else if (errorMessage.indexOf('streamIdInUse') !== -1) {
        errorMessage = 'Stream have been already published. Please close the previous connection.';
      } else if (errorMessage.indexOf('publishTimeoutError') !== -1) {
        errorMessage = 'WebRTC Publishing Timeout Error';
      } else if (errorMessage.indexOf('not_allowed_unregistered_streams') !== -1) {
        errorMessage = 'Stream with an unregistered id is not allowed';
      } else if (errorMessage.indexOf('UnsecureContext') !== -1) {
        errorMessage = 'Fatal Error: Browser cannot access camera and mic because of unsecure context. Please install SSL and access via https';
      } else if (errorMessage.indexOf('WebSocketNotSupported') !== -1) {
        errorMessage = 'Fatal Error: WebSocket not supported in this browser';
      } else if (errorMessage.indexOf('AudioAlreadyActive') !== -1) {
        errorMessage = 'AudioAlreadyActive';
      } else if (errorMessage.indexOf('isTrusted') !== -1) {
        errorMessage = `WebSocket connection to ${websocketURL} failed`;
        window.location.reload();
      } else {
        errorMessage = 'WebRTCAdaptor Connection Error';
      }

      errorMessage && _message.error(errorMessage, 3);
    }

    muteLocalMic() {
      if (this.webRTCAdaptor) {
        this.webRTCAdaptor.muteLocalMic();
        this.setState({ isMicMuted: true });
        _message.success('Muted local mic successfully');
      }
    }

    unmuteLocalMic() {
      if (this.webRTCAdaptor) {
        this.webRTCAdaptor.unmuteLocalMic();
        this.setState({ isMicMuted: false });
        _message.success('Unmuted local mic successfully');
      }
    }

    render() {
      const { forwardedRef } = this.props;
      return (
        <Component
          {...this.props}
          {...this.state}
          webRTCAdaptor={this.webRTCAdaptor}
          initWebRTCAdaptor={this.initWebRTCAdaptor.bind(this)}
          muteLocalMic={this.muteLocalMic.bind(this)}
          unmuteLocalMic={this.unmuteLocalMic.bind(this)}
          leaveSession={this.leaveSession.bind(this)}
          ref={forwardedRef}
        />
      );
    }
  }
  return React.forwardRef((props: IProps, ref) => (
    <AntMediaComponent {...props} forwardedRef={ref} />
  ));

  // const mapStateToProps = (state) => ({ settings: state.streaming.settings });
  // const MapComponent = connect(mapStateToProps)(AntMediaComponent);
}
