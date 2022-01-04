/* eslint-disable no-console */
import React, { PureComponent } from 'react';
import Header from 'next/head';
import { Row, Col, message, Button } from 'antd';
import Router, { withRouter, NextRouter } from 'next/router';
import { IPerformer, IUser, StreamSettings } from 'src/interfaces';
import { streamService } from 'src/services';
import { connect } from 'react-redux';
import { SocketContext, Event } from 'src/socket';
import ChatBox from '@components/stream-chat/chat-box';
import {
  getStreamConversationSuccess,
  resetStreamMessage
} from '@redux/stream-chat/actions';
import GroupPublisher from 'src/components/streaming/webrtc/groupchat/publisher';
import GroupSubscriber from 'src/components/streaming/webrtc/groupchat/subscriber';
import { getResponseError } from '@lib/utils';
import { Description } from '@components/streaming';

import { withTranslation } from '../../../i18n';

// eslint-disable-next-line no-shadow
enum STREAM_EVENT {
  JOINED_THE_ROOM = 'JOINED_THE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  RECEIVED_PAID_TOKEN = 'RECEIVED_PAID_TOKEN',
  STREAM_INFORMATION_CHANGED = 'private-stream/streamInformationChanged'
}

const STREAM_JOINED = 'private-stream/streamJoined';
const STREAM_LEAVED = 'private-stream/streamLeaved';
const JOINED_THE_ROOM = 'JOINED_THE_ROOM';

interface IProps {
  router: NextRouter;
  username: string;
  user: IPerformer;
  isStreaming: boolean;
  setStreaming: Function;
  getStreamConversationSuccess: Function;
  activeConversation: any;
  resetStreamMessage: Function;
  tipSound: string;
  settings: StreamSettings;
  t: any;
}

interface IStates {
  // sessionId: string;
  processing: boolean;
  roomJoined: boolean;
  total?: number;
  receivedToken: number;
  members?: IUser[];
}

class ModelPrivateChat extends PureComponent<IProps, IStates> {
  static authenticate = true;

  static onlyPerformer = true;

  private readonly localVideoId = 'group-publisher';

  private readonly remoteVideoContainerClassname = 'group-video-container';

  private mainVideoRef;

  private publisherRef;

  private subscriberRef;

  private socket: SocketIOClient.Socket;

  private streamId: string;

  private streamList: Array<string>;

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
    window.addEventListener('beforeunload', this.onbeforeunload);
    Router.events.on('routeChangeStart', this.onbeforeunload);
    this.socket = this.context;
    this.publisherRef = React.createRef();
    this.subscriberRef = React.createRef();
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

  receivedPaidTokenHandler = ({ token, conversationId }) => {
    const { activeConversation } = this.props;
    const { receivedToken } = this.state;
    if (activeConversation?.data?._id === conversationId) {
      this.setState({
        receivedToken: receivedToken + token
      });
    }
  };

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

  leaveSession() {
    const {
      activeConversation,
      resetStreamMessage: dispatchResetStreamMessage
    } = this.props;
    dispatchResetStreamMessage();
    if (this.socket && activeConversation?.data?._id) {
      this.socket.off(JOINED_THE_ROOM);
      this.socket.off(STREAM_JOINED);
      this.socket.off(STREAM_LEAVED);
      this.socket.off(STREAM_EVENT.RECEIVED_PAID_TOKEN);
      this.socket.emit(STREAM_EVENT.LEAVE_ROOM, {
        conversationId: activeConversation.data._id
      });
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
    const {
      getStreamConversationSuccess: dispatchGetStreamConversationSuccess
    } = this.props;
    try {
      this.setState({ processing: true });
      const resp = await streamService.startGroupChat();
      if (resp && resp.data) {
        const { sessionId, conversation } = resp.data;
        this.socket = this.context;
        this.publisherRef.current &&
          this.publisherRef.current.start(conversation._id, sessionId);
        dispatchGetStreamConversationSuccess({
          data: conversation
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
        roomJoined: true,
        total,
        members
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

  render() {
    const { t } = this.props;
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
              {!roomJoined ? (
                <Button
                  type="primary"
                  onClick={this.startConversation.bind(this)}
                  loading={processing}
                  block
                >
                  {t('Start Conversation')}
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
                  containerClassName={this.remoteVideoContainerClassname}
                  classNames="ant-col ant-col-6"
                  ref={this.publisherRef}
                  configs={{
                    localVideoId: this.localVideoId
                  }}
                />
                <GroupSubscriber
                  {...this.props}
                  ref={this.subscriberRef}
                  containerClassName={this.remoteVideoContainerClassname}
                  classNames="ant-col ant-col-6"
                  configs={{
                    isPlayMode: true
                  }}
                />
              </Row>
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
        </div>
      </>
    );
  }
}

ModelPrivateChat.contextType = SocketContext;

const mapStateToProps = (state) => ({
  user: state.user.current,
  loggedIn: state.auth.loggedIn,
  activeConversation: state.streamMessage.activeConversation,
  ...state.streaming
});

const mapDispatchs = {
  getStreamConversationSuccess,
  resetStreamMessage
};

export default connect(
  mapStateToProps,
  mapDispatchs
)(withRouter(withTranslation('common')(ModelPrivateChat)));
