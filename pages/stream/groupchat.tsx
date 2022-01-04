import React, { PureComponent } from 'react';
import Head from 'next/head';
import Router from 'next/router';
import { Row, Col, message, List } from 'antd';
import GroupChatContainer from '@components/streaming/group-streaming-container';
import { IPerformer, IUIConfig, IUser, StreamSettings } from 'src/interfaces';
import {
  streamService,
  performerService,
  transactionService
} from 'src/services';
import { connect } from 'react-redux';
import {
  getStreamConversation,
  resetStreamMessage
} from '@redux/stream-chat/actions';
import { Event, SocketContext } from 'src/socket';
import nextCookie from 'next-cookies';
import Header from '@components/streaming/header';
import Footer from '@components/streaming/footer';
import ChatBox from '@components/stream-chat/chat-box';
import { getResponseError } from '@lib/utils';
import { updateCurrentUserBalance } from '@redux/user/actions';
import './index.less';
import { StatusCodes } from 'http-status-codes';

import { withTranslation } from '../../i18n';

// eslint-disable-next-line no-shadow
enum STREAM_EVENT {
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  JOINED_THE_ROOM = 'JOINED_THE_ROOM',
  STREAM_INFORMATION_CHANGED = 'private-stream/streamInformationChanged',
  SEND_PAID_TOKEN = 'SEND_PAID_TOKEN'
}

const ListItem = ({
  description,
  title
}: {
  description: string;
  title: string;
}) => (
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
  username: string;
  ui: IUIConfig;
  user: IUser;
  loggedIn: boolean;
  performer: IPerformer;
  isStreaming: boolean;
  setStreaming: Function;
  getStreamConversation: Function;
  updateCurrentUserBalance: Function;
  resetStreamMessage: Function;
  activeConversation: any;
  settings: StreamSettings;
  t: any;
}

interface IStates {
  roomJoined: boolean;
  // sessionId: string;
  processing: boolean;
  total: number;
  members: IUser[];
  callTime: number;
  paidToken: number;
}

class UserGroupChat extends PureComponent<IProps, IStates> {
  static authenticate = true;

  private streamRef: any;

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
      // const error = await Promise.resolve(e);
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
      // sessionId: undefined,
      processing: false,
      roomJoined: false,
      callTime: 0,
      total: 0,
      paidToken: 0,
      members: []
    };
  }

  componentDidMount() {
    this.streamRef = React.createRef();
    this.socket = this.context;
    window.addEventListener('beforeunload', this.onbeforeunload);
    Router.events.on('routeChangeStart', this.onbeforeunload);
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
      this.socket.emit(STREAM_EVENT.LEAVE_ROOM, {
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
    const { performer, getStreamConversation: dispatchGetStreamConversation } =
      this.props;
    try {
      this.setState({ processing: true });
      const resp = await streamService.joinGroupChat(performer._id);
      if (resp && resp.data) {
        this.socket = this.context;
        this.streamRef &&
          this.streamRef.start(resp.data.sessionId, resp.data.conversation._id);
        await dispatchGetStreamConversation({
          conversation: resp.data.conversation
        });
        message.success(this.props.t('Success'));
        this.socket.emit(STREAM_EVENT.JOIN_ROOM, {
          conversationId: resp.data.conversation._id
        });
      }
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(getResponseError(error));
    } finally {
      this.setState({ processing: false });
    }
  }

  stopBroadcast() {
    this.streamRef && this.streamRef.stop();
    setTimeout(() => {
      window.location.href = '/';
    }, 10 * 1000);
  }

  roomJoinedHandler({ total, members, conversationId }) {
    const { activeConversation, performer, user } = this.props;
    if (activeConversation?.data?._id === conversationId) {
      this.interval = setInterval(() => {
        const { callTime } = this.state;
        if (user.balance < performer.groupCallPrice) {
          message.warn(this.props.t('Your balance is not enough token'));
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
        this.stopBroadcast();
      }
    }
  }

  render() {
    const { user, performer, t } = this.props;
    const { processing, total, members, roomJoined, callTime, paidToken } =
      this.state;

    const dataSource = [
      {
        title: t('Call time'),
        description: `${callTime} minute(s)`
      },
      {
        title: t('Status'),
        description: roomJoined ? 'Live' : ''
      },
      {
        title: t('Paid Token'),
        description: `${paidToken} token(s)`
      },
      {
        title: t('Token per minute'),
        description: `${performer.groupCallPrice} token(s)` || 'N/A'
      }
    ];

    return (
      <>
        <Head>
          <title>{t('Group Chat')}</title>
        </Head>
        <Event
          event={STREAM_EVENT.STREAM_INFORMATION_CHANGED}
          handler={this.handler.bind(this)}
        />
        <Event
          event={STREAM_EVENT.JOINED_THE_ROOM}
          handler={this.roomJoinedHandler.bind(this)}
        />
        <>
          <Header {...this.props} />
          <Row>
            <Col lg={12} md={12} xs={24}>
              <GroupChatContainer
                {...this.props}
                participantId={user._id}
                // eslint-disable-next-line no-return-assign
                ref={(ref) => (this.streamRef = ref)}
                sessionId=""
                processing={processing}
                configs={{ localVideoId: 'localVideoId' }}
                onClick={this.joinGroupChat.bind(this)}
                btnText={t('Join Conversation')}
              />
              <Footer {...this.props} inGroupChat />
              <List
                dataSource={dataSource}
                renderItem={(item) => (
                  <ListItem description={item.description} title={item.title} />
                )}
              />
            </Col>
            <Col lg={12} md={12} xs={24}>
              <ChatBox
                {...this.props}
                totalParticipant={total}
                members={members}
              />
            </Col>
          </Row>
        </>
      </>
    );
  }
}

UserGroupChat.contextType = SocketContext;

const mapStateToProps = (state) => ({
  ...state.streaming,
  ui: state.ui,
  user: state.user.current,
  loggedIn: state.auth.loggedIn,
  activeConversation: state.streamMessage.activeConversation
});
const mapDispatchs = {
  getStreamConversation,
  resetStreamMessage,
  updateCurrentUserBalance
};
export default connect(
  mapStateToProps,
  mapDispatchs
)(withTranslation('common')(UserGroupChat));
