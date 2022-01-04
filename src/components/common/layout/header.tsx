/* eslint-disable no-return-assign */
import React, { PureComponent } from 'react';
import {
  SettingOutlined,
  HeartOutlined,
  MessageOutlined,
  UserOutlined,
  LogoutOutlined,
  SearchOutlined,
  CloseOutlined,
  BellOutlined
} from '@ant-design/icons';
import { FundsIcon } from '@components/common/base/icons';
import {
  Layout,
  Menu,
  Avatar,
  Input,
  Button,
  Dropdown,
  Badge,
  Card,
  message,
  Tooltip
} from 'antd';
import { messageService } from 'src/services/index';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import Link from 'next/link';
import Router, { withRouter, NextRouter } from 'next/router';
import {
  IUser,
  IPerformerCategogies,
  IDataResponse,
  IPerformer,
  IStudio,
  IUIConfig,
  StreamSettings
} from 'src/interfaces';
import { logout } from '@redux/auth/actions';
import { getPerformerCategories } from '@redux/performer/actions';
import { getCountries } from '@redux/settings/actions';
import { SocketContext } from 'src/socket';
import { addPrivateRequest } from '@redux/streaming/actions';
import dynamic from 'next/dynamic';
import { formatDate } from 'src/lib';
import { getStudioStats } from 'src/redux/studio/actions';
import SoundPlayer from 'src/components/common/base/sound';
import { countNotReadMessage } from '@redux/message/actions';
import NumberFormat from '@components/common/layout/numberformat';
import LanguageSwitcher from './language-switcher';

import './header.less';
import { SETTING_KEYS } from 'src/constants';

const LeftHeaderContent = dynamic(() => import('./left-header-content'), {
  ssr: false
});

const roundBalance = (balance: number) => {
  if (balance < 10000) return Math.round(balance);
  return '9999+';
};

const EVENT = {
  RECEIVED_PRIVATE_CHAT_REQUEST: 'private-chat-request',
  NOTIFY_READ_MESSAGE: 'nofify_read_messages_in_conversation',
  TIPPED: 'tipped'
};

interface P {
  collapsed?: boolean;
  onCollapseChange?: Function;
  loggedIn?: boolean;
  logout?: Function;
  ui?: IUIConfig;
  getCountries?: Function;
  getPerformerCategories?: Function;
  performerCategories?: IDataResponse<IPerformerCategogies>;
  searchPerformer?: Function;
  addPrivateRequest?: Function;
  countNotReadMessage?: Function;
  totalNotReadMessage?: number;
  router: NextRouter;
  privateRequests?: any;
  getStudioStats?: Function;
  role?: string;
  tipSound?: string;
  currentUser?: IUser & IPerformer & IStudio;
  settings?: StreamSettings;
}

interface S {
  showSearch: boolean;
}

class Header extends PureComponent<P, S> {
  private soundRef;

  private socket: SocketIOClient.Socket;

  constructor(props: P) {
    super(props);
    this.state = {
      showSearch: false
    };
  }

  async componentDidMount() {
    const {
      getPerformerCategories: dispatchGetPerformerCategories,
      getCountries: dispatchGetCountries,
      getStudioStats: dispatchGetStudioStats,
      currentUser,
      loggedIn,
      countNotReadMessage: dispatchCountNotReadMessage
    } = this.props;
    // this.socket = this.context;
    dispatchGetPerformerCategories({ limit: 0 });
    dispatchGetCountries();
    if (currentUser?._id) {
      const data = await (await messageService.countTotalNotRead()).data;
      if (data) {
        dispatchCountNotReadMessage(data.total);
      }
    }

    if (currentUser?._id && currentUser.role === 'studio') {
      dispatchGetStudioStats();
    }

    if (loggedIn) {
      this.initSocketEvent();
      this.checkPermissionAccess();
    }
  }

  componentDidUpdate(prevProps: P) {
    const {
      loggedIn,
      router: {
        query: { unauthorized }
      }
    } = this.props;
    if (loggedIn && prevProps.loggedIn !== loggedIn) {
      setTimeout(this.initSocketEvent, 1000);
    }

    if (unauthorized !== prevProps.router.query.unauthorized) {
      this.checkPermissionAccess();
    }
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.off(EVENT.NOTIFY_READ_MESSAGE);
      this.socket.off(EVENT.RECEIVED_PRIVATE_CHAT_REQUEST);
      this.socket.off(EVENT.TIPPED);
    }
  }

  onSearchPerformer(key: string) {
    this.search(key);
  }

  onPressEnter(event) {
    const target = event.currentTarget as HTMLInputElement;
    const key = target.value;
    this.search(key);
  }

  handleMessage = (event) => {
    const { countNotReadMessage: dispatchCountNotReadMessage } = this.props;
    event && dispatchCountNotReadMessage(event.total);
  };

  handlePrivateChat = (data: { conversationId: string; user: IUser }) => {
    const { addPrivateRequest: dispatchAddPrivateRequest, settings } =
      this.props;
    const path =
      settings[SETTING_KEYS.OPTION_FOR_PRIVATE] === 'webrtc' ? 'webrtc/' : '';
    message.success({
      content: (
        <span>{data.user.username} sent you a private chat request.</span>
      ),
      duration: 10,
      key: data.conversationId,
      onClick: () =>
        Router.push(
          {
            pathname: `/live/${path}privatechat`,
            query: { id: data.conversationId }
          },
          `/live/${path}privatechat/${data.conversationId}`
        )
    });
    this.soundRef && this.soundRef.play();
    dispatchAddPrivateRequest({ ...data, createdAt: new Date() });
  };

  sendTipHandler = ({ token, senderInfo }) => {
    message.success(
      `${senderInfo.username} tip ${token?.toFixed(2)} tokens`,
      10
    );
    this.soundRef && this.soundRef.play();
  };

  initSocketEvent = () => {
    this.socket = this.context;
    const { currentUser } = this.props;
    if (this.socket.connected) {
      if (currentUser.role === 'performer') {
        this.socket.on(
          EVENT.RECEIVED_PRIVATE_CHAT_REQUEST,
          this.handlePrivateChat
        );
        this.socket.on(EVENT.TIPPED, this.sendTipHandler);
      }

      this.socket.on(EVENT.NOTIFY_READ_MESSAGE, this.handleMessage);
    } else {
      this.socket.on('connect', () => {
        if (currentUser.role === 'performer') {
          this.socket.on(
            EVENT.RECEIVED_PRIVATE_CHAT_REQUEST,
            this.handlePrivateChat
          );
          this.socket.on(EVENT.TIPPED, this.sendTipHandler);
        }

        this.socket.on(EVENT.NOTIFY_READ_MESSAGE, this.handleMessage);
      });
    }
  };

  search(key: string) {
    Router.push({ pathname: '/', query: { q: key } }, `/?q=${key}`);
  }

  async checkPermissionAccess() {
    const {
      loggedIn,
      router: {
        query: { unauthorized }
      }
    } = this.props;
    if (!loggedIn || !unauthorized) {
      return;
    }

    this.beforeLogout();
  }

  async beforeLogout() {
    const { logout: dispatchLogout } = this.props;
    dispatchLogout();
    Router.replace('/');
  }

  render() {
    const {
      ui,
      loggedIn,
      privateRequests,
      currentUser,
      tipSound,
      totalNotReadMessage,
      settings
    } = this.props;
    const { showSearch } = this.state;
    const path =
      settings[SETTING_KEYS.OPTION_FOR_PRIVATE] === 'webrtc' ? 'webrtc/' : '';
    const rightContent = loggedIn ? (
      <>
        <Link
          href={
            loggedIn && currentUser.role === 'user'
              ? '/account/user/funds-tokens'
              : '#'
          }
        >
          <Tooltip
            title={`${
              (currentUser.balance && currentUser.balance.toFixed(2)) || 0
            } Tokens`}
          >
            <Button
              style={{ margin: '0px 10px', color: '#ff0066' }}
              className="btn-tokens"
            >
              {`${roundBalance(currentUser?.balance || 0)} Tokens`}
            </Button>
          </Tooltip>
        </Link>
        {currentUser.role === 'performer' && (
          <Dropdown
            overlay={
              <Menu>
                {privateRequests.length > 0 ? (
                  privateRequests.map((request) => (
                    <Menu.Item
                      onClick={() => message.destroy(request.conversationId)}
                    >
                      <Link
                        href={{
                          pathname: `/live/${path}privatechat`,
                          query: {
                            id: request.conversationId,
                            streamId: request.id
                          }
                        }}
                        as={`/live/${path}privatechat/${request.conversationId}?streamId=${request.id}`}
                        key={request.conversationId}
                      >
                        <a>
                          <Card bordered={false} hoverable={false}>
                            <Card.Meta
                              avatar={
                                <Avatar
                                  src={
                                    request.user?.avatar ||
                                    '/default-user-icon.png'
                                  }
                                />
                              }
                              title={
                                <>
                                  <span>{request.user?.username}</span> (
                                  <NumberFormat
                                    value={request.user?.balance || 0}
                                    suffix=" tokens"
                                  />
                                  )
                                </>
                              }
                              description={formatDate(request?.createdAt)}
                            />
                          </Card>
                        </a>
                      </Link>
                    </Menu.Item>
                  ))
                ) : (
                  <Menu.Item>There are no private request.</Menu.Item>
                )}
              </Menu>
            }
          >
            <span className="call-requests">
              <Badge count={privateRequests.length} showZero>
                <BellOutlined style={{ color: '#ffffff' }} />
              </Badge>
            </span>
          </Dropdown>
        )}
        <Dropdown
          overlay={
            <Menu key="menu-right-content">
              {currentUser.role === 'user' && [
                <Menu.Item
                  key="settings-menu-right-content"
                  onClick={() => Router.push('/account/user/account-settings')}
                >
                  <span>
                    <SettingOutlined className="primary-icon" /> Profile
                  </span>
                </Menu.Item>,
                <Menu.Item
                  key="favorite-menu-right-content"
                  onClick={() => Router.push('/account/user/favorites')}
                >
                  <span>
                    <HeartOutlined className="primary-icon" /> My Favorites
                  </span>
                </Menu.Item>,
                <Menu.Item
                  key="funds-tokens-menu-right-content"
                  onClick={() => Router.push('/account/user/funds-tokens')}
                >
                  <span>
                    <span className="anticon primary-icon">
                      <FundsIcon />
                    </span>{' '}
                    Funds / Tokens
                  </span>
                </Menu.Item>,
                <Menu.Item
                  key="user-messages-menu-right-content"
                  onClick={() => Router.push('/messages')}
                >
                  <span>
                    <MessageOutlined className="primary-icon" /> Messages (
                    {totalNotReadMessage || 0})
                  </span>
                </Menu.Item>
              ]}

              {currentUser.role === 'performer' && [
                <Menu.Item
                  key="profile-menu-right-content"
                  onClick={() => Router.push('/account/performer/profile')}
                >
                  <span>
                    <UserOutlined className="primary-icon" /> Profile
                  </span>
                </Menu.Item>,
                <Menu.Item
                  key="account-settings-menu-right-content"
                  onClick={() =>
                    Router.push('/account/performer/account-settings')
                  }
                >
                  <span>
                    <SettingOutlined className="primary-icon" /> Account
                    Settings
                  </span>
                </Menu.Item>,
                <Menu.Item
                  key="model-messages-menu-right-content"
                  onClick={() => Router.push('/messages')}
                >
                  <span>
                    <MessageOutlined className="primary-icon" /> Messages (
                    {totalNotReadMessage})
                  </span>
                </Menu.Item>
              ]}
              {currentUser.role === 'studio' && [
                <Menu.Item
                  key="account-settings-menu-right-content"
                  onClick={() => Router.push('/studio/account-settings')}
                >
                  <span>
                    <SettingOutlined className="primary-icon" /> Account
                    Settings
                  </span>
                </Menu.Item>
              ]}
              <Menu.Item key="log-out" onClick={this.beforeLogout.bind(this)}>
                <LogoutOutlined className="primary-icon" /> Log out
              </Menu.Item>
            </Menu>
          }
        >
          <Avatar
            style={{
              margin: '0 15px',
              cursor: 'pointer',
              background: '#ffffff'
            }}
            src={currentUser?.avatar || '/default-user-icon.png'}
          />
        </Dropdown>
      </>
    ) : (
      <Button
        className="btn-login"
        onClick={() => Router.push('/auth/login/user', '/auth/login')}
      >
        Login
      </Button>
    );

    return (
      <Layout.Header className="header" id="layoutHeader">
        <SoundPlayer ref={(ref) => (this.soundRef = ref)} soundUrl={tipSound} />
        <div className="left-container">
          <Link href="/">
            <a className="header-logo">
              <img
                src={
                  typeof ui.logo === 'string' && ui.logo.length > 0
                    ? ui.logo
                    : '/xcam-logo-white.png'
                }
                alt="header-logo"
              />
            </a>
          </Link>
          <LeftHeaderContent {...this.props} current={currentUser} />
          <div id="google_translate_element"></div>
        </div>
        <div className="right-container">
          <LanguageSwitcher />
          <div
            className={showSearch ? 'search-icon active' : 'search-icon'}
            aria-hidden
            onClick={() => this.setState({ showSearch: !showSearch })}
          >
            {showSearch ? <CloseOutlined /> : <SearchOutlined />}
          </div>
          <div className={!showSearch ? 'hide search-bar' : 'search-bar'}>
            <Input.Search
              placeholder="Enter keyword"
              loading={false}
              allowClear
              enterButton
              onPressEnter={this.onPressEnter.bind(this)}
              onSearch={this.onSearchPerformer.bind(this)}
            />
          </div>
          {rightContent}
        </div>
      </Layout.Header>
    );
  }
}

Header.contextType = SocketContext;

const userSelecter = (state) => state.user.current;
const performerSelecter = (state) => state.performer.current;
const studioSelecter = (state) => state.studio.current;
const authSelecter = (state) => state.auth;

const currentUserSelecter = createSelector(
  userSelecter,
  performerSelecter,
  studioSelecter,
  authSelecter,
  (user, performer, studio, auth) => {
    if (!auth.loggedIn) return {};

    if (user?._id) {
      return { ...user, role: 'user' };
    }

    if (performer?._id) {
      return { ...performer, role: 'performer' };
    }

    if (studio?._id) {
      return { ...studio, role: 'studio' };
    }

    return {};
  }
);

Header.contextType = SocketContext;

const mapStateToProps = (state: any) => ({
  ui: { ...state.ui },
  currentUser: currentUserSelecter(state),
  tipSound: state.settings.tipSound,
  loggedIn: state.auth.loggedIn,
  performerCategories: state.performer.categories,
  totalNotReadMessage: state.message.totalNotReadMessage,
  ...state.streaming
});
const mapDispatch = {
  logout,
  getPerformerCategories,
  getCountries,
  addPrivateRequest,
  getStudioStats,
  countNotReadMessage
};
export default connect(mapStateToProps, mapDispatch)(withRouter(Header));
