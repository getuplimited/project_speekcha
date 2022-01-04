/* eslint-disable no-return-assign */
import { message, Button, List, Row, Col, Tooltip } from 'antd';
import { LikeOutlined } from '@ant-design/icons';
import PageHeader from '@components/common/layout/page-header';
import Head from 'next/head';
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { getPerformerPhotos } from '@redux/photos/actions';
import { updateCurrentUserBalance } from '@redux/user/actions';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { IPhoto, IPerformerGallery, IUser, ISearch } from 'src/interfaces';
import nextCookie from 'next-cookies';
import Error from 'pages/_error';
import {
  getResponseError,
  capitalizeFirstLetter,
  shortenLargeNumber
} from 'src/lib';
import { galleryService, photoService, reactionService } from 'src/services';
import { ListComments, CommentForm } from '@components/comment';
import {
  getComments,
  moreComment,
  createComment,
  deleteComment
} from '@redux/comment/actions';
import './index.less';
import ModalBuyAssets from '@components/performer-assets/common/modal-buy-assets';
import Loader from '@components/common/base/loader';
import NumberFormat from '@components/common/layout/numberformat';

import { withTranslation } from '../../i18n';

interface IProps {
  isBrowser: boolean;
  loggedIn: boolean;
  query: any;
  data: IPerformerGallery;
  updateCurrentUserBalance: Function;
  currentUser: IUser;
  commentState: any;
  getComments: Function;
  moreComment: Function;
  createComment: Function;
  deleteComment: Function;
  commentMapping: any;
  t: any;
}
interface IStates {
  photos: IPhoto[];
  gallery: IPerformerGallery;
  totalPhoto: number;
  searching: boolean;
  limit: number;
  offset: number;
  selectedItem: number;
  success: boolean;
  loading: boolean;
  commentFilterQuery: ISearch;
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

class PhotosPages extends PureComponent<IProps, IStates> {
  static authenticate = false;

  static layout = 'public';

  private buyAssetsRef;

  static async getInitialProps({ ctx }) {
    try {
      const { query } = ctx;
      if (query.data)
        return { data: JSON.parse(query.data), isBrowser: process.browser };
      if (query.id) {
        const { token } = nextCookie(ctx);
        const headers = { Authorization: token };
        const resp = await galleryService.publicdetails(query.id, headers);

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
      photos: [],
      limit: 12,
      offset: 0,
      totalPhoto: 0,
      selectedItem: 0,
      loading: false,
      success: true,
      searching: false,
      gallery: null,
      commentFilterQuery: {
        limit: 12,
        offset: 0
      }
    };
  }

  componentDidMount() {
    this.getPhotosByGallery();
    const { data, isBrowser } = this.props;
    isBrowser
      ? this.getGalleryDetail()
      : this.setState({ gallery: data, success: true, loading: false });
  }

  handleBuyClick() {
    const { data } = this.props;
    this.buyAssetsRef && this.buyAssetsRef.showModalBuyAssets(data, 'gallery');
  }

  onSucess() {
    this.getPhotosByGallery();
  }

  async onReaction(action: string) {
    const { gallery } = this.state;
    const { currentUser } = this.props;
    if (!currentUser || !currentUser._id) {
      message.error(this.props.t('Please login'));
      return;
    }

    try {
      const postData = {
        objectId: gallery._id,
        action,
        objectType: 'gallery'
      };
      switch (action) {
        case 'like':
          gallery.isLiked
            ? await reactionService.delete(postData)
            : await reactionService.create(postData);
          break;
        default:
          break;
      }
      if (action === 'like') {
        this.setState({
          gallery: {
            ...gallery,
            isLiked: !gallery.isLiked,
            stats: {
              ...gallery.stats,
              likes: gallery.stats.likes + (!gallery.isLiked ? 1 : -1)
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
    const { limit, offset } = this.state;
    dispatchGetComments({
      objectId: data._id,
      limit,
      offset
    });
  }

  async getGalleryDetail() {
    const { data } = this.props;

    this.setState({ success: false, loading: true });

    try {
      const resp = await galleryService.publicdetails(data._id);
      this.setState({ gallery: resp.data, success: true });
    } catch (error) {
      this.responseError(error);
    } finally {
      this.setState({ loading: false });
    }
  }

  async getPhotosByGallery() {
    const { data } = this.props;
    const { limit, offset } = this.state;

    try {
      this.setState({ searching: true });
      const resp = await photoService.searchByGallery(data._id, {
        limit,
        offset
      });
      this.setState({
        photos: resp.data.data,
        totalPhoto: resp.data.total
      });
    } catch (error) {
      this.responseError(error);
    } finally {
      this.setState({ searching: false });
    }
  }

  async moreComment() {
    const { moreComment: handleLoadMore } = this.props;
    const { commentFilterQuery, gallery } = this.state;
    await this.setState({
      commentFilterQuery: {
        ...commentFilterQuery,
        offset: commentFilterQuery.limit + commentFilterQuery.offset
      }
    });
    handleLoadMore({
      limit: commentFilterQuery.limit,
      offset: commentFilterQuery.limit + commentFilterQuery.offset,
      objectId: gallery._id
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

  async loadMore(index: number) {
    const { totalPhoto, photos, limit } = this.state;
    let { offset } = this.state;
    const { data } = this.props;
    const position = index + 1;
    if (position !== photos.length) return;

    const hasMore = photos.length < totalPhoto;
    if (hasMore) {
      try {
        offset = limit + offset;
        const resp = await photoService.searchByGallery(data._id, {
          limit,
          offset
        });
        this.setState({ photos: [...photos, ...resp.data.data], offset });
      } catch (error) {
        this.responseError(error);
      } finally {
        this.setState({ searching: false });
      }
    }
  }

  async responseError(e) {
    const err = await Promise.resolve(e);
    message.error(getResponseError(err));
  }

  render() {
    const { photos, selectedItem, success, loading, gallery, searching } =
      this.state;
    const {
      data,
      commentMapping,
      createComment: handleCreateComment,
      currentUser,
      t
    } = this.props;

    console.log(currentUser, gallery);

    const comments =
      gallery?._id && commentMapping[gallery._id]
        ? commentMapping[gallery?._id].items
        : [];
    const fetchingComment =
      gallery?._id && commentMapping[gallery._id]
        ? commentMapping[gallery._id].requesting
        : false;
    const totalComments =
      gallery?._id && commentMapping[gallery._id]
        ? commentMapping[gallery?._id].total
        : gallery?.stats.comments;

    if (!data) return <Error statusCode={404} />;

    const { name, description, token, isSale, numOfItems } = data;
    const dataSource = [
      {
        title: t('Name'),
        description: name
      },
      { title: t('Description'), description },
      { title: t('Photos'), description: numOfItems },
      {
        title: t('Price'),
        description: !isSale ? (
          t('Free')
        ) : (
          <NumberFormat value={token} suffix={t('tokens')} />
        )
      }
    ];
    return (
      <>
        <Head>
          <title> {t('Photos')} </title>
        </Head>
        <ModalBuyAssets
          ref={(ref) => (this.buyAssetsRef = ref)}
          onSucess={this.onSucess.bind(this)}
          {...this.props}
        />
        <div className="photo-page">
          <PageHeader
            title={`${capitalizeFirstLetter(name)} Gallery`}
            extra={
              <Button
                type="primary"
                hidden={gallery?.isBought}
                onClick={this.handleBuyClick.bind(this)}
              >
                {t('Buy this gallery')}!
              </Button>
            }
          />
          {success && !loading && (
            <div className="photo-carousel-content">
              {searching && <Loader spinning fullScreen={false} />}
              <Carousel
                dynamicHeight
                onClickItem={(index) =>
                  this.setState({ selectedItem: index + 1 })
                }
                selectedItem={selectedItem}
                onChange={this.loadMore.bind(this)}
                showIndicators
                swipeable
              >
                {photos.length > 0 &&
                  photos.map((p) => (
                    <div key={p._id}>
                      <img
                        alt=""
                        src={p.photo.url}
                        style={{ objectFit: 'contain' }}
                      />
                      <p className="legend">{p.title}</p>
                    </div>
                  ))}
              </Carousel>
              <Tooltip
                title={gallery?.isLiked === true ? t('Unlike') : t('Like')}
              >
                <Button
                  className={
                    gallery?.isLiked === true ? 'react-btn active' : 'react-btn'
                  }
                  onClick={this.onReaction.bind(this, 'like')}
                >
                  {shortenLargeNumber(gallery?.stats?.likes || 0)}{' '}
                  <LikeOutlined />
                </Button>
              </Tooltip>
              {gallery && (
                <CommentForm
                  creator={currentUser}
                  onSubmit={handleCreateComment.bind(this)}
                  objectId={gallery?._id}
                  objectType="gallery"
                  requesting={false}
                />
              )}

              <p>{`${t('Comments')} (${gallery?.stats?.comments || 0})`}</p>
              <ListComments
                key={`list_comments_${gallery?._id}_${comments.length}`}
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
              <List
                dataSource={dataSource}
                renderItem={(item) => (
                  <ListItem description={item.description} title={item.title} />
                )}
              />
            </div>
          )}
        </div>
      </>
    );
  }
}
const mapStates = (state) => ({
  photos: state.photos.data,
  total: state.photos.total,
  searching: state.photos.searching,
  success: state.photos.success,
  currentUser: state.user.current,
  loggedIn: state.auth.loggedIn,
  commentMapping: { ...state.comment.commentMapping }
});
const mapDispatchs = {
  getPerformerPhotos,
  updateCurrentUserBalance,
  getComments,
  moreComment,
  createComment,
  deleteComment
};
export default connect(
  mapStates,
  mapDispatchs
)(withTranslation('common')(PhotosPages));
