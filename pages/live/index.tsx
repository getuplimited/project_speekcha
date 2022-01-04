/* eslint-disable camelcase */
/* eslint-disable dot-notation */
import React, { PureComponent } from 'react';
import Head from 'next/head';
import { Row, Col, Button, message, Modal, Select } from 'antd';
import { connect } from 'react-redux';
import { IPerformer, IUser, StreamSettings } from 'src/interfaces';
import { messageService, streamService } from 'src/services';
import LivePublisher from '@components/streaming/publisher';
import { SocketContext, Event } from 'src/socket';
import {
  getStreamConversationSuccess,
  loadStreamMessages,
  resetStreamMessage,
  resetAllStreamMessage
} from '@redux/stream-chat/actions';
import { updateStreamingStatus } from '@redux/performer/actions';
import { WEBRTC_ADAPTOR_INFORMATIONS } from 'src/antmedia/constants';
import ChatBox from '@components/stream-chat/chat-box';
import UpdateSatusForm from '@components/performer/streaming-status-update-form';
import Router from 'next/router';
import { getResponseError } from '@lib/utils';

import './index.less';
import { withTranslation } from '../../i18n';

// eslint-disable-next-line no-shadow
enum EVENT_NAME {
  ROOM_INFORMATIOM_CHANGED = 'public-room-changed',
  USER_LEFT_ROOM = 'USER_LEFT_ROOM'
}

interface P {
  settings: StreamSettings;
  resetStreamMessage: Function;
  resetAllStreamMessage: Function;
  getStreamConversationSuccess: Function;
  loadStreamMessages: Function;
  updateStreamingStatus: Function;
  activeConversation: any;
  performer: IPerformer;
  updating: boolean;
  updateSuccess: boolean;
  updateError: any;
  loggedIn: boolean;
  t: any;
}

interface S {
  loading: boolean;
  sessionId: string;
  initialized: boolean;
  publish_started: boolean;
  total?: number;
  members?: IUser[];
  // blockedUserIds?: string[];
  selectCategoryModal: boolean;
  categories: any;
}

class PerformerLivePage extends PureComponent<P, S> {
  static authenticate = true;

  private publisherRef: any;

  private socket: SocketIOClient.Socket;

  private liveStreamCategoryIds = [] as any;

  constructor(props: P) {
    super(props);
    this.state = {
      loading: false,
      initialized: false,
      publish_started: false,
      sessionId: '',
      total: 0,
      members: [],
      selectCategoryModal: false,
      categories: [] as any
    };
  }

  componentDidMount() {
    this.socket = this.context;
    this.joinPublicRoom();
    window.addEventListener('beforeunload', this.onbeforeunload);
    Router.events.on('routeChangeStart', this.onbeforeunload);
    this.searchCategories();
  }

  componentDidUpdate(prevProps: P) {
    const { updateSuccess, updateError } = this.props;
    if (prevProps.updateSuccess !== updateSuccess && updateSuccess) {
      message.success(this.props.t('Update Status Success'));
    }

    if (prevProps.updateError !== updateError && updateError) {
      message.error(getResponseError(updateError));
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

  handleUpdateStatusForm(data) {
    const { updateStreamingStatus: dispatchUpdateStreamingStatus } = this.props;
    dispatchUpdateStreamingStatus(data);
  }

  onbeforeunload = () => {
    this.leavePublicRoom();
  };

  start = async () => {
    try {
      this.setState({ loading: true });
      const resp = await streamService.goLive({
        categoryIds: this.liveStreamCategoryIds || []
      });
      const { sessionId } = resp.data;
      this.setState({ sessionId });
      this.publisherRef?.start();
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(getResponseError(error));
    } finally {
      this.setState({ loading: false });
    }
  };

  onCategoryChange = (val) => {
    this.liveStreamCategoryIds = val;
  };

  modalCancel = () => {
    this.setState({ selectCategoryModal: false });
  };

  async joinPublicRoom() {
    const {
      loadStreamMessages: dispatchLoadStreamMessages,
      getStreamConversationSuccess: dispatchGetStreamConversationSuccess
    } = this.props;
    try {
      this.setState({ loading: true });
      const resp = await streamService.goLive();
      const { conversation } = resp.data;
      if (conversation && conversation._id) {
        dispatchGetStreamConversationSuccess({ data: conversation });
        dispatchLoadStreamMessages({
          conversationId: conversation._id,
          limit: 25,
          offset: 0,
          type: conversation.type
        });
        this.socket = this.context;
        this.socket &&
          this.socket.emit('public-stream/join', {
            conversationId: conversation._id
          });
      }
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(getResponseError(error));
    } finally {
      this.setState({ loading: false });
    }
  }

  leavePublicRoom() {
    const { activeConversation, resetStreamMessage: reset } = this.props;
    if (this.socket && activeConversation && activeConversation.data) {
      const conversation = { ...activeConversation.data };
      this.socket.emit('public-stream/leave', {
        conversationId: conversation._id
      });
      reset();
    }
  }

  userLeftRoomHandle({ username, conversationId }) {
    const { activeConversation } = this.props;
    if (activeConversation?.data?._id === conversationId) {
      const { total, members } = this.state;
      this.setState({
        total: total - 1,
        members: members.filter((m) => m.username !== username)
      });
    }
  }

  async removeAllMessage() {
    const {
      activeConversation,
      performer,
      resetAllStreamMessage: dispatchResetAllMessage
    } = this.props;
    if (
      !activeConversation.data ||
      performer._id !== activeConversation.data.performerId
    ) {
      return;
    }

    try {
      if (
        !window.confirm(
          `${this.props.t('Are you sure you want to remove chat history')}?`
        )
      ) {
        return;
      }
      await messageService.deleteAllMessageInConversation(
        activeConversation.data._id
      );
      dispatchResetAllMessage({ conversationId: activeConversation.data._id });
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(getResponseError(error));
    }
  }

  async searchCategories() {
    try {
      this.setState({ loading: true });
      const resp = await streamService.search();
      await this.setState({ categories: resp.data.data });
    } catch (e) {
      message.error(this.props.t('An error occurred, please try again!'));
    } finally {
      this.setState({ loading: false });
    }
  }

  callback(info: WEBRTC_ADAPTOR_INFORMATIONS) {
    const { activeConversation } = this.props;
    const { sessionId } = this.state;
    if (activeConversation && activeConversation.data) {
      this.socket = this.context;
      if (info === WEBRTC_ADAPTOR_INFORMATIONS.INITIALIZED) {
        this.setState({ initialized: true });
        // window['webRTCAdaptor'].publish(sessionId);
        this.publisherRef && this.publisherRef.publish(sessionId);
      } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.PUBLISH_STARTED) {
        this.setState({ publish_started: true, loading: false });
        this.socket.emit('public-stream/live', {
          conversationId: activeConversation.data._id
        });
      } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.PUBLISH_FINISHED) {
        this.setState({ loading: false, publish_started: false });
      } else if (info === WEBRTC_ADAPTOR_INFORMATIONS.CLOSED) {
        this.setState({
          loading: false,
          initialized: false,
          publish_started: false
        });
      }
    }
  }

  render() {
    const { performer, activeConversation, updating } = this.props;
    const {
      loading,
      initialized,
      publish_started,
      members,
      total,
      selectCategoryModal,
      categories
    } = this.state;
    const { t } = this.props;
    // const { showModal, handleOk, handleCancel } = this.modal.bind(this);
    return (
      <>
        <Head>
          <title>{t('Go Live')}</title>
        </Head>

        <Event
          event={EVENT_NAME.ROOM_INFORMATIOM_CHANGED}
          handler={this.handler.bind(this)}
        />
        <Event
          event={EVENT_NAME.USER_LEFT_ROOM}
          handler={this.userLeftRoomHandle.bind(this)}
        />

        <Row>
          <Col xs={24} sm={24} md={12}>
            <UpdateSatusForm
              status={performer.streamingTitle}
              updating={updating}
              submit={this.handleUpdateStatusForm.bind(this)}
            />
            {(!initialized || !publish_started) && (
              <Button
                type="primary"
                onClick={() => this.setState({ selectCategoryModal: true })}
                loading={loading}
                block
              >
                {t('Start Streaming')}
              </Button>
            )}
            <LivePublisher
              {...this.props}
              participantId={performer._id}
              // eslint-disable-next-line no-return-assign
              ref={(ref) => (this.publisherRef = ref)}
              callback={this.callback.bind(this)}
              configs={{
                debug: true,
                bandwidth: 900,
                localVideoId: 'publisher'
              }}
            />
          </Col>
          <Col xs={24} sm={24} md={12}>
            <ChatBox
              {...this.props}
              members={members}
              totalParticipant={total}
              currentPerformer={performer}
            />
            {activeConversation?.data && (
              <div style={{ margin: '10px' }}>
                <Button
                  type="primary"
                  onClick={this.removeAllMessage.bind(this)}
                >
                  {t('Clear message history')}
                </Button>
              </div>
            )}
          </Col>
        </Row>
        <Modal
          title={t('Please select your livestream category')}
          onOk={this.start}
          onCancel={this.modalCancel.bind(this)}
          visible={selectCategoryModal}
        >
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            onChange={this.onCategoryChange}
          >
            {categories?.map((category) => (
              <Select.Option value={category._id} key={category._id}>
                {category.name}
              </Select.Option>
            ))}
          </Select>
        </Modal>
      </>
    );
  }
}

PerformerLivePage.contextType = SocketContext;

const mapStateToProps = (state) => ({
  ...state.streaming,
  performer: state.performer.current,
  updating: state.performer.updating,
  updateSuccess: state.performer.updateSuccess,
  updateError: state.performer.updateError,
  activeConversation: state.streamMessage.activeConversation,
  loggedIn: state.auth.loggedIn
});
const mapDispatchs = {
  updateStreamingStatus,
  getStreamConversationSuccess,
  loadStreamMessages,
  resetStreamMessage,
  resetAllStreamMessage
};
export default connect(
  mapStateToProps,
  mapDispatchs
)(withTranslation('common')(PerformerLivePage));
