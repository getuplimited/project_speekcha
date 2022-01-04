import React, { PureComponent } from 'react';
import Header from 'next/head';
import { Row, Col, message, List, Button } from 'antd';
import Router, { withRouter, NextRouter } from 'next/router';
import { IPerformer, IUIConfig, IUser, StreamSettings } from 'src/interfaces';
import {
  performerService,
  streamService,
  transactionService
} from 'src/services';
import { connect } from 'react-redux';
import {
  getStreamConversationSuccess,
  loadMoreStreamMessages,
  resetStreamMessage
} from '@redux/stream-chat/actions';
import { updateCurrentUserBalance } from '@redux/user/actions';
import { SocketContext, Event } from 'src/socket';
import nextCookie from 'next-cookies';
import ChatBox from '@components/stream-chat/chat-box';
import { getResponseError } from '@lib/utils';
import GroupPublisher from '@components/streaming/webrtc/groupchat/publisher';
import GroupSubscriber from '@components/streaming/webrtc/groupchat/subscriber';
import { StatusCodes } from 'http-status-codes';
// import './index.less';

import { withTranslation } from '../../../i18n';

// eslint-disable-next-line no-shadow
enum EVENT {
  JOINED_THE_ROOM = 'JOINED_THE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  STREAM_INFORMATION_CHANGED = 'private-stream/streamInformationChanged',
  MODEL_JOIN_ROOM = 'MODEL_JOIN_ROOM',
  SEND_PAID_TOKEN = 'SEND_PAID_TOKEN'
}

const STREAM_JOINED = 'private-stream/streamJoined';
const STREAM_LEAVED = 'private-stream/streamLeaved';
const JOINED_THE_ROOM = 'JOINED_THE_ROOM';

const ListItem = ({ description, title }: any) => (
  <List.Item>
    <Row style={{ width: '100%' }}>
      <Col className="light-text" sm={{ span: 6 }} xs={{ span: 12 }}>
        {title}
      </Col>
      <Col style={{ fontWeight: 'bold' }} sm={{ span: 18 }} xs={{ span: 12 }}>
        {description}
      </Col>
    </Row>
  </List.Item>
);

interface IProps {
  ui: IUIConfig;
  router: NextRouter;
  loggedIn: boolean;
  username: string;
  performer: IPerformer;
  user: IUser;
  getStreamConversationSuccess: Function;
  loadMoreStreamMessages: Function;
  activeConversation: any;
  resetStreamMessage: Function;
  updateCurrentUserBalance: Function;
  settings: StreamSettings;
  t: any;
}

interface IStates {
  roomJoined: boolean;
  processing: boolean;
  total: number;
  members: IUser[];
  callTime: number;
  paidToken: number;
}

class UserPrivateChat extends PureComponent<IProps, IStates> {
  static authenticate = true;

  private readonly localVideoId = 'group-publisher';

  private readonly remoteVideoContainerClassname = 'group-video-container';

  private mainVideoRef;

  private publisherRef;

  private subscriberRef;

  private streamId: string;

  private streamList: Array<string>;

  private interval: NodeJS.Timeout;

  private socket: SocketIOClient.Socket;

  static async getInitialProps({ ctx }) {
    try {
      const { query } = ctx;
      if (process.browser && query.performer) {
        return {
          performer: JSON.parse(query.performer)
        };
      }

      const { token } = nextCookie(ctx);
      const headers = { Authorization: token };
      const resp = await performerService.details(query.username, headers);
      const performer = resp.data;
      if (performer.isBlocked) {
        throw StatusCodes.FORBIDDEN;
      }

      return {
        performer
      };
    } catch (e) {
      // const err = await Promise.resolve(e);
      if (process.browser) {
        return Router.push('/');
      }

      ctx.res.writeHead && ctx.res.writeHead(302, { Location: '/' });
      ctx.res.end && ctx.res.end();
      return {};
    }
  }

  constructor(props: IProps) {
    super(props);
    this.state = {
      processing: false,
      roomJoined: false,
      total: 0,
      callTime: 0,
      paidToken: 0,
      members: []
    };
  }

  componentDidMount() {
    this.publisherRef = React.createRef();
    this.subscriberRef = React.createRef();
    this.mainVideoRef = React.createRef();
    this.socket = this.context;
    window.addEventListener('beforeunload', this.onbeforeunload);
    Router.events.on('routeChangeStart', this.onbeforeunload);
  }

  componentDidUpdate(prevProps: IProps) {
    const { activeConversation } = this.props;
    if (
      activeConversation?.data?._id &&
      activeConversation !== prevProps.activeConversation
    ) {
      this.initSocketEvent();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onbeforeunload);
    Router.events.off('routeChangeStart', this.onbeforeunload);
  }

  handler({ total, members, conversationId }) {
    const { activeConversation } = this.props;
    if (activeConversation?.data?._id === conversationId) {
      this.setState({
        total,
        members
      });
    }
  }

  handleRemoteVideo(event) {
    const { srcObject } = event.target;
    this.mainVideoRef.current.srcObject = srcObject;
    this.mainVideoRef.current.hidden = false;
    this.mainVideoRef.current.play();
  }

  onbeforeunload = () => {
    this.leaveSession();
  };

  leaveSession() {
    const {
      activeConversation,
      resetStreamMessage: dispatchResetStreamMessage
    } = this.props;
    dispatchResetStreamMessage();
    if (this.socket && activeConversation && activeConversation.data) {
      this.socket.off(JOINED_THE_ROOM);
      this.socket.off(STREAM_JOINED);
      this.socket.off(STREAM_LEAVED);
      this.socket.emit(EVENT.LEAVE_ROOM, {
        conversationId: activeConversation.data._id
      });
    }

    if (this.interval) {
      clearInterval(this.interval);
    }

    this.setState({
      processing: false,
      roomJoined: false,
      total: 0,
      members: []
    });
  }

  async joinGroupChat() {
    const {
      performer,
      getStreamConversationSuccess: dispatchGetStreamConversationSuccess,
      loadMoreStreamMessages: dispatchLoadStreamMessages
    } = this.props;
    try {
      this.setState({ processing: true });
      const resp = await streamService.joinGroupChat(performer._id);
      if (resp && resp.data) {
        this.socket = this.context;
        const { sessionId, conversation } = resp.data;
        this.publisherRef.current &&
          this.publisherRef.current.start(conversation._id, sessionId);
        dispatchGetStreamConversationSuccess({
          data: conversation
        });
        dispatchLoadStreamMessages({
          conversationId: conversation._id,
          limit: 25,
          offset: 0,
          type: conversation.type
        });
        message.success(this.props.t('Success'));
        this.socket.emit(EVENT.JOIN_ROOM, {
          conversationId: conversation._id
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
    const { activeConversation, performer, user } = this.props;
    if (activeConversation?.data?._id === conversationId) {
      this.interval = setInterval(() => {
        const { callTime } = this.state;
        if (user.balance < performer.groupCallPrice) {
          message.warn(`${this.props.t('Your balance is not enough token')}.`);
          setTimeout(() => window.location.reload(), 10 * 1000);
          return;
        }

        this.setState({ callTime: callTime + 1 });
        this.sendPaidToken(conversationId);
      }, 60 * 1000);

      this.setState({
        total,
        members,
        roomJoined: true,
        callTime: 0
      });
    }
  }

  leave() {
    this.publisherRef.current && this.publisherRef.current.stop();
    this.subscriberRef.current && this.subscriberRef.current.stop();

    setTimeout(() => {
      window.location.href = '/';
    }, 10 * 1000);
  }

  async sendPaidToken(conversationId: string) {
    try {
      const { performer, updateCurrentUserBalance: dispatchUpdateBalance } =
        this.props;
      const { paidToken } = this.state;
      await transactionService.sendPaidToken(conversationId);
      const newState = { paidToken: paidToken + performer.groupCallPrice };
      this.setState(newState);
      dispatchUpdateBalance(performer.groupCallPrice * -1);
    } catch (err) {
      const error = await Promise.resolve(err);
      if (error.statusCode === 400) {
        message.error(
          this.props.t('Your tokens do not enough, please buy more')
        );
        clearInterval(this.interval);
        this.leave();
      }
    }
  }

  initSocketEvent() {
    this.socket = this.context;
    this.socket.on(
      JOINED_THE_ROOM,
      ({ streamId, streamList, conversationId }) => {
        const { activeConversation } = this.props;
        if (conversationId !== activeConversation.data._id) return;

        this.streamId = streamId;
        this.streamList = streamList;
        this.publisherRef.current &&
          this.publisherRef.current.publish(streamId);
        if (streamList.length) {
          this.subscriberRef.current &&
            this.subscriberRef.current.play(streamList);
        }
      }
    );
    this.socket.on(STREAM_JOINED, (data: { streamId: string }) => {
      if (this.streamId !== data.streamId) {
        this.subscriberRef.current &&
          this.subscriberRef.current.play([data.streamId]);
      }
    });
    this.socket.on(STREAM_LEAVED, (data: { streamId: string }) => {
      this.streamList = this.streamList.filter((id) => id !== data.streamId);
      if (this.streamId !== data.streamId) {
        this.subscriberRef.current &&
          this.subscriberRef.current.close(data.streamId);
      }
    });
  }

  render() {
    const { performer, t } = this.props;
    const { processing, total, members, roomJoined, callTime, paidToken } =
      this.state;

    const dataSource = [
      {
        title: 'Call time',
        description: `${callTime} minute(s)`
      },
      {
        title: 'Status',
        description: roomJoined ? 'Live' : ''
      },
      {
        title: 'Paid Token',
        description: `${paidToken} token(s)`
      },
      {
        title: 'Token per minute',
        description: `${performer.groupCallPrice} token(s)` || 'N/A'
      }
    ];

    return (
      <>
        <Header>
          <title>{t('Group Chat')}</title>
        </Header>
        <Event
          event={EVENT.STREAM_INFORMATION_CHANGED}
          handler={this.handler.bind(this)}
        />
        <Event
          event={EVENT.JOINED_THE_ROOM}
          handler={this.roomJoinedHandler.bind(this)}
        />
        <div className="container">
          <Row>
            <Col md={12} xs={24}>
              {!roomJoined ? (
                <Button
                  type="primary"
                  onClick={this.joinGroupChat.bind(this)}
                  loading={processing}
                  block
                >
                  {t('Join Conversation')}
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={this.leave.bind(this)}
                  block
                  disabled={processing}
                >
                  {t('Stop Streaming')}
                </Button>
              )}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <video
                  id="subscriber"
                  ref={this.mainVideoRef}
                  hidden
                  controls
                />
              </div>
              <Row className={this.remoteVideoContainerClassname}>
                <GroupPublisher
                  {...this.props}
                  id={this.localVideoId}
                  ref={this.publisherRef}
                  classNames="ant-col ant-col-6"
                  containerClassName={this.remoteVideoContainerClassname}
                  configs={{
                    localVideoId: this.localVideoId
                  }}
                />
                <GroupSubscriber
                  {...this.props}
                  ref={this.subscriberRef}
                  classNames="ant-col ant-col-6"
                  onClick={this.handleRemoteVideo.bind(this)}
                  containerClassName={this.remoteVideoContainerClassname}
                  configs={{
                    isPlayMode: true
                  }}
                />
              </Row>
              <List
                dataSource={dataSource}
                renderItem={(item) => (
                  <ListItem description={item.description} title={item.title} />
                )}
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
        </div>
      </>
    );
  }
}

UserPrivateChat.contextType = SocketContext;

const mapStateToProps = (state) => ({
  ...state.streaming,
  ui: state.ui,
  user: state.user.current,
  loggedIn: state.auth.loggedIn,
  activeConversation: state.streamMessage.activeConversation
});
const mapDispatchs = {
  getStreamConversationSuccess,
  loadMoreStreamMessages,
  resetStreamMessage,
  updateCurrentUserBalance
};
export default connect(
  mapStateToProps,
  mapDispatchs
)(withRouter(withTranslation('common')(UserPrivateChat)));
