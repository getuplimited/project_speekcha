/* eslint-disable no-console */
import './index.less';
import { PureComponent, createRef } from 'react';
import Header from 'next/head';
import { Row, Col, message } from 'antd';
import Router, { withRouter, NextRouter } from 'next/router';
import PrivateChatContainer from '@components/streaming/private-streaming-container';
import { IUser, StreamSettings } from 'src/interfaces';
import { streamService } from 'src/services';
import { connect } from 'react-redux';
import { accessPrivateRequest } from 'src/redux/streaming/actions';
import { SocketContext, Event } from 'src/socket';
import ChatBox from '@components/stream-chat/chat-box';
import {
  getStreamConversationSuccess,
  resetStreamMessage
} from '@redux/stream-chat/actions';
import { getResponseError } from '@lib/utils';
import { Description } from '@components/streaming';
import AntVideoPlayer from '@components/streaming/ant-video-player';

import { withTranslation } from '../../i18n';

// eslint-disable-next-line no-shadow
enum STREAM_EVENT {
  JOINED_THE_ROOM = 'JOINED_THE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  RECEIVED_PAID_TOKEN = 'RECEIVED_PAID_TOKEN',
  STREAM_INFORMATION_CHANGED = 'private-stream/streamInformationChanged'
}

interface IProps {
  settings: StreamSettings;
  router: NextRouter;
  getStreamConversationSuccess: Function;
  activeConversation: any;
  resetStreamMessage: Function;
  accessPrivateRequest: Function;
  t: any;
}

interface IStates {
  // sessionId: string;
  processing: boolean;
  total?: number;
  members?: IUser[];
  roomJoined: boolean;
  receivedToken: number;
}

class ModelPrivateChat extends PureComponent<IProps, IStates> {
  static authenticate = true;

  static onlyPerformer = true;

  private streamRef: any;

  private previewPlayerRef;

  private socket: SocketIOClient.Socket;

  static async getInitialProps({ ctx }) {
    if (!ctx.query.id) {
      if (process.browser) {
        Router.push('/');
        return;
      }

      ctx.res.writeHead && ctx.res.writeHead(302, { Location: '/' });
      ctx.res.end && ctx.res.end();
    }
  }

  constructor(props: IProps) {
    super(props);
    this.state = {
      // sessionId: '',
      processing: false,
      roomJoined: false,
      total: 0,
      receivedToken: 0,
      members: []
    };
  }

  componentDidMount() {
    const { router, accessPrivateRequest: access } = this.props;
    const {
      query: { id, streamId }
    } = router;
    window.addEventListener('beforeunload', this.onbeforeunload);
    Router.events.on('routeChangeStart', this.onbeforeunload);
    this.socket = this.context;
    this.previewPlayerRef = createRef();
    this.proccessRequest(streamId);
    access(id);
  }

  componentDidUpdate(prevProps: IProps) {
    const {
      activeConversation,
      router,
      accessPrivateRequest: access
    } = this.props;
    if (prevProps.router.query.id !== router.query.id) {
      const {
        query: { id, streamId }
      } = router;
      this.socket = this.context;
      access(id);
      this.previewPlayerRef.current &&
        this.previewPlayerRef.current.resetPlaybackVideo();
      this.proccessRequest(`${streamId}`);
    }

    if (prevProps.activeConversation !== activeConversation) {
      prevProps.activeConversation?._id &&
        this.socket.emit(STREAM_EVENT.LEAVE_ROOM, {
          conversationId: prevProps.activeConversation._id
        });
    }
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onbeforeunload);
    Router.events.off('routeChangeStart', this.onbeforeunload);
  }

  handler({ total, members, conversationId }) {
    const { activeConversation } = this.props;
    if (activeConversation?.data?._id === conversationId) {
      this.setState({ total, members });
    }
  }

  onbeforeunload = () => {
    this.leaveSession();
  };

  receivedPaidTokenHandler = ({ token, conversationId }) => {
    const { activeConversation } = this.props;
    const { receivedToken } = this.state;
    if (activeConversation?.data?._id === conversationId) {
      this.setState({
        receivedToken: receivedToken + token
      });
    }
  };

  leaveSession() {
    const {
      activeConversation,
      resetStreamMessage: dispatchResetStreamMessage
    } = this.props;
    if (this.socket && activeConversation?.data?._id) {
      this.socket.emit(STREAM_EVENT.LEAVE_ROOM, {
        conversationId: activeConversation.data._id
      });
      this.socket.off(STREAM_EVENT.RECEIVED_PAID_TOKEN);
      dispatchResetStreamMessage();
      this.previewPlayerRef.current &&
        this.previewPlayerRef.current.resetPlaybackVideo();
    }
    this.setState({
      processing: false,
      roomJoined: false,
      total: 0,
      receivedToken: 0,
      members: []
    });
  }

  async acceptRequest() {
    const {
      router,
      getStreamConversationSuccess: dispatchGetStreamConversationSuccess
    } = this.props;
    if (!router.query.id) return;

    try {
      this.setState({ processing: true });
      const resp = await streamService.acceptPrivateChat(`${router.query.id}`);
      if (resp && resp.data) {
        this.socket = this.context;
        const { sessionId, conversation } = resp.data;
        this.socket &&
          this.socket.emit(STREAM_EVENT.JOIN_ROOM, {
            conversationId: conversation._id
          });
        this.streamRef && this.streamRef.start(sessionId, conversation._id);
        dispatchGetStreamConversationSuccess({
          data: conversation
        });
      }
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(getResponseError(error));
    } finally {
      this.setState({ processing: false });
    }
  }

  roomJoinedHandler({ total, members, conversationId }) {
    const { activeConversation } = this.props;
    if (activeConversation?.data?._id === conversationId) {
      this.setState({
        total,
        members,
        roomJoined: true
      });
      this.previewPlayerRef.current &&
        this.previewPlayerRef.current.resetPlaybackVideo();
    }
  }

  proccessRequest(streamId: string | string[]) {
    const { roomJoined } = this.state;
    if (roomJoined) {
      return;
    }

    if (streamId) {
      setTimeout(() => {
        if (!this.previewPlayerRef.current) {
          this.proccessRequest(streamId);
          return;
        }

        this.previewPlayerRef.current.playHLS(streamId);
      }, 1000);
    }
  }

  render() {
    const { settings, t } = this.props;
    const { processing, total, members, roomJoined, receivedToken } =
      this.state;
    return (
      <>
        <Header>
          <title>{t('Private Chat')}</title>
        </Header>

        <Event
          event={STREAM_EVENT.STREAM_INFORMATION_CHANGED}
          handler={this.handler.bind(this)}
        />
        <Event
          event={STREAM_EVENT.JOINED_THE_ROOM}
          handler={this.roomJoinedHandler.bind(this)}
        />
        <Event
          event={STREAM_EVENT.RECEIVED_PAID_TOKEN}
          handler={this.receivedPaidTokenHandler.bind(this)}
        />

        <Row>
          <Col md={12} xs={24}>
            <PrivateChatContainer
              {...this.props}
              containerClassName={!roomJoined ? 'hidden' : ''}
              role_data="performer"
              // eslint-disable-next-line no-return-assign
              ref={(ref) => (this.streamRef = ref)}
              configs={{
                localVideoId: 'private-publisher'
              }}
              btnText={t('Accept Video Call Request')}
              onClick={this.acceptRequest.bind(this)}
              processing={processing}
            />
            <AntVideoPlayer
              ref={this.previewPlayerRef}
              containerClassName={roomJoined ? 'hidden' : ''}
              settings={settings}
              configs={{ isPlayMode: true }}
            />
            <Description
              roomJoined={roomJoined}
              receivedToken={receivedToken}
            />
          </Col>
          <Col xs={24} md={12}>
            <ChatBox
              {...this.props}
              totalParticipant={total}
              members={members}
            />
          </Col>
        </Row>
      </>
    );
  }
}

ModelPrivateChat.contextType = SocketContext;

const mapStateToProps = (state) => ({
  loggedIn: state.auth.loggedIn,
  activeConversation: state.streamMessage.activeConversation,
  ...state.streaming
});

const mapDispatchs = {
  accessPrivateRequest,
  getStreamConversationSuccess,
  resetStreamMessage
};

export default connect(
  mapStateToProps,
  mapDispatchs
)(withRouter(withTranslation('common')(ModelPrivateChat)));
