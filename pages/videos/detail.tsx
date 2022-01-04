/* eslint-disable no-return-assign */
import { Button, message, Alert, Tooltip } from 'antd';
import {
  HourglassOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  LikeOutlined
} from '@ant-design/icons';
import Head from 'next/head';
import React, { PureComponent } from 'react';
import './index.less';
import { ListComments, CommentForm } from '@components/comment';
import {
  getComments,
  moreComment,
  createComment,
  deleteComment
} from '@redux/comment/actions';
import { updateCurrentUserBalance } from '@redux/user/actions';
import {
  videoService,
  purchaseItemService,
  reactionService
} from 'src/services';
import { IVideo, IUser, IPerformer, IUIConfig, ISearch } from 'src/interfaces';
import { connect } from 'react-redux';
import Popup from 'src/components/common/base/popup';
import {
  capitalizeFirstLetter,
  getResponseError,
  formatDate,
  formatDuration,
  shortenLargeNumber
} from 'src/lib';
import nextCookie from 'next-cookies';
import Error from 'pages/_error';
import Loader from '@components/common/base/loader';
import NumberFormat from '@components/common/layout/numberformat';
import Router from 'next/router';
import ProfileCard from '@components/performer/profile-card';

import { withTranslation } from '../../i18n';

interface IProps {
  ui: IUIConfig;
  isBrowser: boolean;
  loggedIn: boolean;
  query: any;
  data: IVideo;
  updateCurrentUserBalance: Function;
  currentUser: IUser;
  currentPerformer: IPerformer;
  commentState: any;
  getComments: Function;
  moreComment: Function;
  createComment: Function;
  deleteComment: Function;
  commentMapping: any;
  t: any;
}
interface IStates {
  video: IVideo;
  loading: boolean;
  success: boolean;
  commentFilterQuery: ISearch;
}

class VideoDetailPage extends PureComponent<IProps, IStates> {
  static authenticate = false;

  static layout = 'public';

  private popupRef;

  static async getInitialProps({ ctx }) {
    try {
      const { query } = ctx;
      if (query.data)
        return { data: JSON.parse(query.data), isBrowser: process.browser };
      if (query.id) {
        const { token } = nextCookie(ctx);
        const headers = { Authorization: token };
        const resp = await videoService.userFindVideoById(query.id, headers);
        return {
          data: resp.data,
          isBrowser: process.browser
        };
      }
    } catch {
      return {};
    }
    return {};
  }

  constructor(props: IProps) {
    super(props);
    this.state = {
      video: null,
      loading: true,
      success: false,
      commentFilterQuery: {
        limit: 12,
        offset: 0
      }
    };
  }

  componentDidMount() {
    const { data, isBrowser } = this.props;
    isBrowser
      ? this.getVideoDetail()
      : this.setState({ video: data, success: true, loading: false });
    this.getComment();
  }

  async onOk() {
    const {
      currentUser,
      data,
      updateCurrentUserBalance: dispatchUpdateCurrentUserBalance
    } = this.props;
    try {
      if (!currentUser || !currentUser._id) {
        message.error(`${this.props.t('Please login to buy this video')}!`);
        return Router.push('/auth/login');
      }

      await purchaseItemService.purchaseVideo(data._id);
      this.popupRef && this.popupRef.setVisible(false);
      this.getVideoDetail();
      const value = -1 * data.token;
      dispatchUpdateCurrentUserBalance(value);
    } catch (error) {
      this.responseError(error);
    }
    return undefined;
  }

  async onReaction(action: string) {
    const { video } = this.state;
    const { currentUser } = this.props;
    if (!currentUser || !currentUser._id) {
      message.error(this.props.t('Please login'));
      return;
    }

    try {
      const postData = {
        objectId: video._id,
        action,
        objectType: 'video'
      };
      switch (action) {
        case 'like':
          video.isLiked
            ? await reactionService.delete(postData)
            : await reactionService.create(postData);
          break;
        default:
          break;
      }
      if (action === 'like') {
        this.setState({
          video: {
            ...video,
            isLiked: !video.isLiked,
            stats: {
              ...video.stats,
              likes: video.stats.likes + (!video.isLiked ? 1 : -1)
            }
          }
        });
      }
    } catch (e) {
      const error = await e;
      message.error(
        error.message || this.props.t('Error occured, please try again later')
      );
    }
  }

  async onSubmitComment(values: any) {
    const { createComment: createCommentHandler } = this.props;
    createCommentHandler(values);
  }

  getComment() {
    const { data, getComments: dispatchGetComments } = this.props;
    const {
      commentFilterQuery: { limit, offset }
    } = this.state;
    dispatchGetComments({
      objectId: data._id,
      limit,
      offset
    });
  }

  async getVideoDetail() {
    const { data } = this.props;
    this.setState({ success: false, loading: true });

    try {
      const resp = await videoService.userFindVideoById(data._id);

      this.setState({ video: resp.data, success: true });
    } catch (error) {
      this.responseError(error);
    } finally {
      this.setState({ loading: false });
    }
  }

  async moreComment() {
    const { moreComment: handleLoadMore } = this.props;
    const { commentFilterQuery, video } = this.state;
    await this.setState({
      commentFilterQuery: {
        ...commentFilterQuery,
        offset: commentFilterQuery.limit + commentFilterQuery.offset
      }
    });
    handleLoadMore({
      limit: commentFilterQuery.limit,
      offset: commentFilterQuery.limit + commentFilterQuery.offset,
      objectId: video._id
    });
  }

  async deleteComment(item) {
    const { deleteComment: handleDelete } = this.props;
    if (
      !window.confirm(`${this.props.t('Are you sure to remove this comment')}?`)
    )
      return;
    handleDelete(item._id);
  }

  purchase() {
    const { loggedIn } = this.props;
    if (!loggedIn)
      return message.error(`${this.props.t('Please login to buy this video')}`);

    this.popupRef && this.popupRef.setVisible(true);
    return undefined;
  }

  download() {
    const { video } = this.state;
    if (!video) return;

    if (video.isBought || !video.isSaleVideo) {
      const e = document.createElement('a');
      e.href = video.video.url;
      e.target = '_blank';
      document.body.appendChild(e);
      e.click();
    }
  }

  async responseError(e) {
    const err = await Promise.resolve(e);
    message.error(getResponseError(err));
  }

  render() {
    const { video, success, loading } = this.state;

    const {
      data,
      ui,
      loggedIn,
      currentUser,
      commentMapping,
      createComment: handleCreateComment,
      t
    } = this.props;

    const comments =
      video?._id && commentMapping[video._id]
        ? commentMapping[video?._id].items
        : [];
    const fetchingComment =
      video?._id && commentMapping[video._id]
        ? commentMapping[video._id].requesting
        : false;
    const totalComments =
      video?._id && commentMapping[video._id]
        ? commentMapping[video?._id].total
        : video?.stats.comments;

    if (!data) return <Error statusCode={404} />;

    const dataSource: { title: string; description: any }[] = [
      {
        title: `${this.props.t('Posted by')}:`,
        description: data?.performer?.username
      },
      {
        title: `${t('Added on')}:`,
        description: formatDate(data.createdAt)
      },
      {
        title: `${t('Duration')}:`,
        description: formatDuration(data.video?.duration)
      }
    ];
    data.isSaleVideo &&
      dataSource.push({
        title: `${t('Price')} :`,
        description: <NumberFormat value={data.token} suffix=" Tokens" />
      });
    return (
      <>
        <Head>
          <title>{video && video.title ? video.title : 'Video'}</title>
          <meta name="keywords" content={video && video.description} />
          <meta name="description" content={video && video.description} />
          {/* OG tags */}
          <meta
            property="og:title"
            content={`${ui?.siteName} | ${video?.title || 'Video'}`}
            key="title"
          />
          <meta property="og:image" content={video && video.thumbnail} />
          <meta property="og:keywords" content={video && video.description} />
          <meta
            property="og:description"
            content={video && video.description}
          />
        </Head>
        <>
          <Popup
            ref={(ref) => (this.popupRef = ref)}
            title={`Buy Video ${data?.title}`}
            content={
              <div>
                <strong>{t('Available high quality Video')}</strong>
                <h3>
                  <NumberFormat
                    value={data.token}
                    prefix={`${t('Buy')} ${capitalizeFirstLetter(
                      data?.title || ''
                    )} ${t('For')} `}
                    suffix={t('Tokens')}
                  />
                </h3>
              </div>
            }
            onOk={this.onOk.bind(this)}
          />
          <div className="video-detail-page">
            {!loading && success ? (
              <>
                <div className="video-header">
                  <div className="vid-title">{video?.title}</div>
                  <div className="vid-duration">
                    <HourglassOutlined />
                    &nbsp;
                    {formatDuration(video?.video?.duration || 0)}
                  </div>
                  <div className="vid-duration">
                    <ClockCircleOutlined />
                    &nbsp;
                    {formatDate(video?.createdAt)}
                  </div>
                </div>
                <div className="video-player">
                  {(!video.isSaleVideo || video.isBought) && (
                    <video
                      src={video?.video?.url}
                      controls
                      poster={video?.thumbnail}
                    />
                  )}
                  {video.isSaleVideo && !video.isBought && video.trailer && (
                    <>
                      <video
                        src={video?.trailer.url}
                        controls
                        poster={video?.thumbnail}
                      />
                      <p style={{ margin: '10px', textAlign: 'center' }}>
                        You&apos;re watching teaser video
                      </p>
                    </>
                  )}
                  {video.isSaleVideo && !video.isBought && !video.trailer && (
                    <img src={video?.thumbnail} alt="" />
                  )}
                </div>
                <div className="video-stats">
                  {video?.isSaleVideo && !video.isBought && (
                    <Button
                      type="primary"
                      htmlType="button"
                      onClick={this.purchase.bind(this)}
                    >
                      {t('Buy Video')}
                    </Button>
                  )}
                  {((loggedIn && video?.isBought) ||
                    (loggedIn && !video?.isSaleVideo)) && (
                    <Button
                      type="dashed"
                      htmlType="button"
                      onClick={this.download.bind(this)}
                    >
                      <DownloadOutlined /> {t('Download')}
                    </Button>
                  )}
                  <Tooltip
                    title={video?.isLiked === true ? t('Unlike') : t('Like')}
                  >
                    <Button
                      className={
                        video?.isLiked === true
                          ? 'react-btn active'
                          : 'react-btn'
                      }
                      onClick={this.onReaction.bind(this, 'like')}
                    >
                      {shortenLargeNumber(video?.stats?.likes || 0)}{' '}
                      <LikeOutlined />
                    </Button>
                  </Tooltip>
                </div>
                {video?.isSaleVideo && !video?.isBought && (
                  <div style={{ margin: '10px 0' }}>
                    <Alert
                      message={`${t(
                        'To view full content, please buy this video'
                      )}!`}
                      type="error"
                    />
                  </div>
                )}
                <div className="video-info">
                  <div className="video-description">
                    {video?.description || t('No video description')}
                  </div>
                </div>
                <CommentForm
                  creator={currentUser}
                  onSubmit={handleCreateComment.bind(this)}
                  objectId={video?._id}
                  objectType="video"
                  requesting={false}
                />
                <p>{`${t('Comments')} (${video?.stats?.comments || 0})`}</p>
                <ListComments
                  key={`list_comments_${video?._id}_${comments.length}`}
                  requesting={fetchingComment}
                  comments={comments}
                  total={totalComments}
                  onDelete={this.deleteComment.bind(this)}
                  user={currentUser}
                  canReply
                />
                {comments.length < totalComments && (
                  <p className="text-center">
                    <a aria-hidden onClick={this.moreComment.bind(this)}>
                      {t('More comments')}...
                    </a>
                  </p>
                )}
                {data?.performer && (
                  <ProfileCard
                    placeholderAvatarUrl={ui?.placeholderAvatarUrl}
                    performer={data.performer}
                    searching={loading}
                    success={success}
                  />
                )}
              </>
            ) : (
              <>
                <Loader spinning />
              </>
            )}
          </div>
        </>
      </>
    );
  }
}

const mapStates = (state) => ({
  ui: state.ui,
  loggedIn: state.auth.loggedIn,
  currentUser: state.user.current,
  currentPerformer: state.performer.current,
  commentMapping: { ...state.comment.commentMapping }
});
const mapDispatchs = {
  updateCurrentUserBalance,
  getComments,
  moreComment,
  createComment,
  deleteComment
};

export default connect(
  mapStates,
  mapDispatchs
)(withTranslation('common')(VideoDetailPage));
