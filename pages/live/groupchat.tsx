import './index.less';
import { PureComponent } from 'react';
import Header from 'next/head';
import { Row, Col, message } from 'antd';
import GroupChatContainer from '@components/streaming/group-streaming-container';
import { IPerformer, IUser, StreamSettings } from 'src/interfaces';
import { streamService } from 'src/services';
import { connect } from 'react-redux';
import {
  resetStreamMessage,
  getStreamConversation
} from '@redux/stream-chat/actions';
import { SocketContext, Event } from 'src/socket';
import ChatBox from '@components/stream-chat/chat-box';
import Router from 'next/router';
import { Description } from '@components/streaming';
import { getResponseError } from '@lib/utils';

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
  user: IPerformer;
  settings: StreamSettings;
  activeConversation: any;
  resetStreamMessage: Function;
  getStreamConversation: Function;
  t: any;
}

interface IStates {
  processing: boolean;
  total?: number;
  members?: IUser[];
  roomJoined: boolean;
  receivedToken: number;
}

class PerformerGroupChat extends PureComponent<IProps, IStates> {
  static authenticate = true;

  static onlyPerformer = true;

  private streamRef: any;

  private socket: SocketIOClient.Socket;

  constructor(props: IProps) {
    super(props);
    this.state = {
      processing: false,
      roomJoined: false,
      total: 0,
      receivedToken: 0,
      members: []
    };
  }

  componentDidMount() {
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
    }
    this.setState({
      processing: false,
      roomJoined: false,
      total: 0,
      receivedToken: 0,
      members: []
    });
  }

  async startConversation() {
    const { getStreamConversation: dispatchGetStreamConversation } = this.props;
    try {
      this.setState({ processing: true });
      const resp = await streamService.startGroupChat();
      if (resp && resp.data) {
        this.socket = this.context;
        this.streamRef &&
          this.streamRef.start(resp.data.sessionId, resp.data.conversation._id);
        dispatchGetStreamConversation({
          conversation: resp.data.conversation
        });
        this.socket &&
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

  roomJoinedHandler({ total, members, conversationId }) {
    const { activeConversation } = this.props;
    if (activeConversation?.data?._id === conversationId) {
      this.setState({
        total,
        members,
        roomJoined: true
      });
    }
  }

  render() {
    const { user, t } = this.props;
    const { processing, total, members, roomJoined, receivedToken } =
      this.state;
    return (
      <>
        <Header>
          <title>{t('Group Chat')}</title>
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
        <div className="container">
          <Row>
            <Col md={12} xs={24}>
              <GroupChatContainer
                {...this.props}
                participantId={user._id}
                // eslint-disable-next-line no-return-assign
                ref={(ref) => (this.streamRef = ref)}
                processing={processing}
                sessionId=""
                configs={{ localVideoId: 'localVideoId' }}
                onClick={this.startConversation.bind(this)}
                btnText="Start Conversation"
              />
              <Description
                roomJoined={roomJoined}
                receivedToken={receivedToken}
              />
            </Col>
            <Col md={12} xs={24}>
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

PerformerGroupChat.contextType = SocketContext;

const mapStateToProps = (state) => ({
  ...state.streaming,
  user: state.user.current,
  loggedIn: state.auth.loggedIn,
  activeConversation: state.streamMessage.activeConversation
});
const mapDispatchs = {
  getStreamConversation,
  resetStreamMessage
};
export default connect(
  mapStateToProps,
  mapDispatchs
)(withTranslation('common')(PerformerGroupChat));
