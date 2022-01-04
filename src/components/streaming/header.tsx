import React from 'react';
import {
  Row, Col, Button, message
} from 'antd';
import { IPerformer, IUser, IUIConfig } from 'src/interfaces';
import { GiftIcon } from '@components/common/base/icons';
import Popup from '@components/common/base/popup';
import { defaultColor } from 'src/lib';
import {
  HeartFilled,
  HeartOutlined,
  MailOutlined,
  PlusCircleOutlined
} from '@ant-design/icons';
import { favouriteService, transactionService } from 'src/services';
import { getResponseError, checkUserLogin } from 'src/lib/utils';
import Router from 'next/router';
import NumberFormat from '@components/common/layout/numberformat';
import SendTipContent from './tip/content';
import './header.less';

interface P {
  activeConversation: any;
  updateCurrentUserBalance: Function;
  loggedIn: boolean;
  user: IUser;
  performer: IPerformer;
  ui: IUIConfig;
}

const btnStyle = { height: 35, margin: 8 };

export default ({
  performer,
  ui,
  loggedIn,
  user,
  updateCurrentUserBalance,
  activeConversation
}: P) => {
  const tipPopupRef = React.createRef<Popup>();
  let contentRef;
  const { _id, username } = performer;
  const [isFavorite, setIsFavorite] = React.useState(
    performer.isFavorite || false
  );
  const [disableOk, setDisableOk] = React.useState(false);
  const [tipping, setTipping] = React.useState(false);
  const handleError = async (e) => {
    const error = await Promise.resolve(e);
    message.error(getResponseError(error));
  };

  const onLike = async () => {
    if (!checkUserLogin(loggedIn, user)) {
      message.error('Please login to add favorite!');
      return;
    }

    try {
      await favouriteService.favorite(_id, isFavorite);
      setIsFavorite(!isFavorite);
    } catch (e) {
      handleError(e);
    }
  };

  const sendGift = () => {
    if (!checkUserLogin(loggedIn, user)) {
      message.error(`Please login to send gift to ${username}!`);
    }
  };

  const notify = () => {
    if (!checkUserLogin(loggedIn, user)) {
      message.error(`Please login to notify ${username}!`);
    }
  };

  const sendMessage = () => {
    if (!checkUserLogin(loggedIn, user)) {
      if (process.browser) {
        Router.push('/auth/login');
      }
      return;
    }

    Router.push({
      pathname: '/messages',
      query: {
        toSource: 'performer',
        toId: _id || ''
      }
    });
  };

  const sendTip = () => {
    if (!checkUserLogin(loggedIn, user)) {
      message.error(`Please login to send tip to ${username}!`);
      return;
    }

    tipPopupRef.current && tipPopupRef.current.setVisible(true);
  };

  const onOk = async () => {
    if (activeConversation?.data?._id) {
      const ref = tipPopupRef.current;
      try {
        setTipping(true);
        const token = contentRef ? contentRef.getValueToken() : 0;
        if (parseInt(token, 10) <= 0) return;

        await transactionService.sendTipToken(
          _id,
          token,
          activeConversation.data._id
        );
        ref && ref.setVisible(false);
        updateCurrentUserBalance && updateCurrentUserBalance(-token);
        const content = (
          <NumberFormat value={token} prefix="You sent " suffix=" tokens" />
        );
        message.success(content);
      } catch (e) {
        handleError(e);
      } finally {
        setTipping(false);
        ref && ref.setVisible(false);
      }
    }
  };

  return (
    <>
      <Popup
        title={`Tips to ${username}`}
        okButtonProps={{ disabled: disableOk }}
        content={(
          <SendTipContent
            ref={(ref) => {
              contentRef = ref;
            }}
            setDisableOk={setDisableOk}
          />
        )}
        loading={tipping}
        ref={tipPopupRef}
        onOk={onOk}
        width={567}
      />
      <Row className="stream-header">
        <Col sm={12} xs={24}>

          <div className="left-content">
            <img src={performer.avatar || ui?.placeholderAvatarUrl || '/user.png'} alt="" className="stream-avatar" />
            {' '}
            <div className="stream-title">
              <span>
                {performer.username}
              </span>
              {performer.streamingTitle && (
              <span>
                {performer.streamingTitle}
              </span>
              )}
            </div>
          </div>
          {/* <span>Report abuse</span> */}
        </Col>
        <Col sm={12} xs={24}>
          {/* <Space className="button-block"> */}
          <Row className="button-block">
            <Button
              type="primary"
              hidden
              icon={<GiftIcon />}
              style={btnStyle}
              onClick={() => sendGift()}
            >
              Send Gift
            </Button>
            <Button
              type="default"
              hidden
              style={btnStyle}
              icon={<HeartOutlined />}
              onClick={() => notify()}
            >
              Notify me
            </Button>
            <Col>
              <Button
                type="default"
                style={btnStyle}
                icon={<MailOutlined />}
                onClick={() => sendMessage()}
              >
                Send message
              </Button>
            </Col>
            <Col>
              <Button
                type="default"
                style={{
                  ...btnStyle,
                  width: 100,
                  flexDirection: 'row',
                  justifyContent: 'center'
                }}
                onClick={() => onLike()}
                icon={
                isFavorite ? (
                  <HeartFilled style={{ color: defaultColor.primaryColor }} />
                ) : (
                  <HeartOutlined style={{ color: defaultColor.primaryColor }} />
                )
              }
              >
                {isFavorite ? 'UnLike' : 'Like'}
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                style={btnStyle}
                onClick={() => sendTip()}
                icon={<PlusCircleOutlined />}
              >
                Send Tip
              </Button>
            </Col>

            {/* </Space> */}
          </Row>
        </Col>
      </Row>
    </>
  );
};
