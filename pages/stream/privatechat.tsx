import React, { PureComponent } from 'react';
import Head from 'next/head';
import { Row, Col, message, List } from 'antd';
import Router, { withRouter, NextRouter } from 'next/router';
import PrivateChatContainer from '@components/streaming/private-streaming-container';
import { IPerformer, IUIConfig, IUser, StreamSettings } from 'src/interfaces';
import Header from '@components/streaming/header';
import Footer from '@components/streaming/footer';
import {
  performerService,
  streamService,
  transactionService
} from 'src/services';
import { connect } from 'react-redux';
import {
  getStreamConversationSuccess,
  resetStreamMessage
} from '@redux/stream-chat/actions';
import { updateCurrentUserBalance } from '@redux/user/actions';
import { SocketContext, Event } from 'src/socket';
import nextCookie from 'next-cookies';
import ChatBox from '@components/stream-chat/chat-box';
import { getResponseError } from '@lib/utils';
import './index.less';
import { StatusCodes } from 'http-status-codes';

import { withTranslation } from '../../i18n';

// eslint-disable-next-line no-shadow
enum EVENT {
  JOINED_THE_ROOM = 'JOINED_THE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  STREAM_INFORMATION_CHANGED = 'private-stream/streamInformationChanged',
  MODEL_JOIN_ROOM = 'MODEL_JOIN_ROOM',
  SEND_PAID_TOKEN = 'SEND_PAID_TOKEN'
}

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

  async handleModelJoinRoom({ conversationId }) {
    const { activeConversation, performer, user } = this.props;
    if (activeConversation?.data?._id === conversationId) {
      message.success(this.props.t('Model joined the room'));
      if (user.balance < performer.privateCallPrice) {
        message.warn(this.props.t('Your balance is not enough token'));
        setTimeout(() => window.location.reload(), 5 * 1000);
      } else {
        this.interval = setInterval(() => {
          const { callTime } = this.state;
          this.setState({ callTime: callTime + 1 });
          this.sendPaidToken(conversationId);
        }, 60 * 1000);
      }
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

  async sendRequest() {
    const {
      performer,
      getStreamConversationSuccess: dispatchGetStreamConversationSuccess
    } = this.props;
    try {
      this.setState({ processing: true });
      const resp = await streamService.requestPrivateChat(performer._id);
      const { sessionId, conversation } = resp.data;
      this.socket = this.context;
      message.success(`${this.props.t('Private request has been sent')}!`);
      this.streamRef && this.streamRef.start(sessionId, conversation._id);
      this.socket.emit(EVENT.JOIN_ROOM, {
        conversationId: conversation._id
      });
      dispatchGetStreamConversationSuccess({
        data: conversation
      });
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
        roomJoined: true,
        callTime: 0
      });
    }
  }

  stopBroadcast() {
    this.streamRef && this.streamRef.stop();
    setTimeout(() => {
      window.location.href = '/';
    }, 5 * 1000);
  }

  async sendPaidToken(conversationId: string) {
    try {
      const { performer, updateCurrentUserBalance: dispatchUpdateBalance } =
        this.props;
      const { paidToken } = this.state;
      await transactionService.sendPaidToken(conversationId);
      const newState = { paidToken: paidToken + performer.privateCallPrice };
      this.setState(newState);
      dispatchUpdateBalance(performer.privateCallPrice * -1);
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
        description: `${performer.privateCallPrice} token(s)` || 'N/A'
      }
    ];

    return (
      <>
        <Head>
          <title>{t('Private Chat')}</title>
        </Head>
        <Event
          event={EVENT.STREAM_INFORMATION_CHANGED}
          handler={this.handler.bind(this)}
        />
        <Event
          event={EVENT.JOINED_THE_ROOM}
          handler={this.roomJoinedHandler.bind(this)}
        />
        <Event
          event={EVENT.MODEL_JOIN_ROOM}
          handler={this.handleModelJoinRoom.bind(this)}
        />
        <>
          <Header {...this.props} />
          <Row>
            <Col lg={12} md={12} xs={24}>
              <PrivateChatContainer
                {...this.props}
                role_data="user"
                participantId={user._id}
                // eslint-disable-next-line no-return-assign
                ref={(ref) => (this.streamRef = ref)}
                sessionId=""
                configs={{
                  localVideoId: 'private-publisher'
                }}
                btnText={t('Send Private Call Request')}
                onClick={this.sendRequest.bind(this)}
                processing={processing}
              />
              <Footer {...this.props} inPrivateChat />
              <List
                dataSource={dataSource}
                renderItem={(item) => (
                  <ListItem description={item.description} title={item.title} />
                )}
              />
            </Col>
            <Col lg={12} xs={24} md={12}>
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
  resetStreamMessage,
  updateCurrentUserBalance
};
export default connect(
  mapStateToProps,
  mapDispatchs
)(withRouter(withTranslation('common')(UserPrivateChat)));
