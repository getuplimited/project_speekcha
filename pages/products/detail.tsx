/* eslint-disable no-return-assign */
import { Button, message, Tooltip, Row, Col } from 'antd';
import { LikeOutlined } from '@ant-design/icons';
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
  purchaseItemService,
  reactionService,
  productService
} from 'src/services';
import {
  IUser,
  IPerformer,
  IUIConfig,
  ISearch,
  IProduct
} from 'src/interfaces';
import { connect } from 'react-redux';
import { getResponseError, shortenLargeNumber } from 'src/lib';
import nextCookie from 'next-cookies';
import Error from 'pages/_error';
import Loader from '@components/common/base/loader';
// import NumberFormat from '@components/common/layout/numberformat';
import Router from 'next/router';
import ProfileCard from '@components/performer/profile-card';

import { withTranslation } from '../../i18n';

interface IProps {
  ui: IUIConfig;
  isBrowser: boolean;
  loggedIn: boolean;
  query: any;
  data: IProduct;
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
  product: IProduct;
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
        const resp = await productService.userFindProductById(
          query.id,
          headers
        );

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
      product: null,
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
      ? this.getProductDetail()
      : this.setState({ product: data, success: true, loading: false });
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
        message.error(this.props.t('Please login to buy product'));
        return Router.push('/auth/login');
      }

      await purchaseItemService.purchaseProduct(data._id);
      this.popupRef && this.popupRef.setVisible(false);
      this.getProductDetail();
      const value = -1 * data.token;
      dispatchUpdateCurrentUserBalance(value);
    } catch (error) {
      this.responseError(error);
    }
    return undefined;
  }

  async onReaction(action: string) {
    const { product } = this.state;
    const { currentUser } = this.props;
    if (!currentUser || !currentUser._id) {
      message.error(this.props.t('Please login'));
      return;
    }

    try {
      const postData = {
        objectId: product._id,
        action,
        objectType: 'product'
      };
      switch (action) {
        case 'like':
          product.isLiked
            ? await reactionService.delete(postData)
            : await reactionService.create(postData);
          break;
        default:
          break;
      }
      if (action === 'like') {
        this.setState({
          product: {
            ...product,
            isLiked: !product.isLiked,
            stats: {
              ...product.stats,
              likes: product.stats.likes + (!product.isLiked ? 1 : -1)
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

  async getProductDetail() {
    const { data } = this.props;
    this.setState({ success: false, loading: true });

    try {
      const resp = await productService.userFindProductById(data._id);

      this.setState({ product: resp.data, success: true });
    } catch (error) {
      this.responseError(error);
    } finally {
      this.setState({ loading: false });
    }
  }

  async moreComment() {
    const { moreComment: handleLoadMore } = this.props;
    const { commentFilterQuery, product } = this.state;
    await this.setState({
      commentFilterQuery: {
        ...commentFilterQuery,
        offset: commentFilterQuery.limit + commentFilterQuery.offset
      }
    });
    handleLoadMore({
      limit: commentFilterQuery.limit,
      offset: commentFilterQuery.limit + commentFilterQuery.offset,
      objectId: product._id
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
      return message.error(
        `${this.props.t('Please login to buy this video')}!`
      );

    this.popupRef && this.popupRef.setVisible(true);
    return undefined;
  }

  // download() {
  //   const { product } = this.state;
  //   if (!product) return;

  //   if (product.isBought || !product.isSaleVideo) {
  //     const e = document.createElement('a');
  //     e.href = video.video.url;
  //     e.target = '_blank';
  //     document.body.appendChild(e);
  //     e.click();
  //   }
  // }

  async responseError(e) {
    const err = await Promise.resolve(e);
    message.error(getResponseError(err));
  }

  render() {
    const { product, success, loading } = this.state;

    const {
      data,
      ui,
      currentUser,
      commentMapping,
      createComment: handleCreateComment,
      t
    } = this.props;

    const comments =
      product?._id && commentMapping[product._id]
        ? commentMapping[product?._id].items
        : [];
    const fetchingComment =
      product?._id && commentMapping[product._id]
        ? commentMapping[product._id].requesting
        : false;
    const totalComments =
      product?._id && commentMapping[product._id]
        ? commentMapping[product?._id].total
        : product?.stats.comments;

    if (!data) return <Error statusCode={404} />;

    return (
      <>
        <Head>
          <title>
            {product && product.name
              ? `Product ${product?.name}`
              : t('Product')}
          </title>
          <meta name="keywords" content={product && product.description} />
          <meta name="description" content={product && product.description} />
          {/* OG tags */}
          <meta
            property="og:title"
            content={`${ui?.siteName} | ${t('Product')} ${product?.name || ''}`}
            key="title"
          />
          <meta property="og:image" content={product && product.image} />
          <meta
            property="og:keywords"
            content={product && product.description}
          />
          <meta
            property="og:description"
            content={product && product.description}
          />
        </Head>
        <>
          <div className="detail-page">
            {!loading && success ? (
              <>
                <div className="product-detail" />
                {product && (
                  <Row className="prod-img">
                    <Col span={6}>
                      <img
                        style={{
                          width: '250px',
                          height: '250px',
                          borderRadius: '10px'
                        }}
                        src={product.image}
                        alt=""
                      />
                    </Col>
                    <Col span={18}>
                      <div
                        style={{
                          color: '#ff0066',
                          fontSize: '18px',
                          fontWeight: 'bold'
                        }}
                      >
                        {product.name}
                      </div>
                      <div>
                        <span style={{ fontWeight: 'bold' }}>{t('Type')}:</span>{' '}
                        {product.type}
                      </div>
                      <div>
                        <span style={{ fontWeight: 'bold' }}>
                          {t('Price')}:
                        </span>{' '}
                        {product.token} {t('tokens')}
                      </div>
                      <div className="product-description">
                        {product?.description || 'No product description'}
                      </div>
                      <div className="video-stats">
                        <Tooltip
                          title={
                            product?.isLiked === true ? t('Unlike') : t('Like')
                          }
                        >
                          <Button
                            className={
                              product?.isLiked === true
                                ? 'react-btn active'
                                : 'react-btn'
                            }
                            onClick={this.onReaction.bind(this, 'like')}
                          >
                            {shortenLargeNumber(product?.stats?.likes || 0)}{' '}
                            <LikeOutlined />
                          </Button>
                        </Tooltip>
                      </div>
                    </Col>
                  </Row>
                )}
                <div style={{ paddingTop: '20px' }}>
                  <CommentForm
                    creator={currentUser}
                    onSubmit={handleCreateComment.bind(this)}
                    objectId={product?._id}
                    objectType="product"
                    requesting={false}
                  />
                </div>
                <p>{`${t('Comments')} (${product?.stats?.comments || 0})`}</p>
                <ListComments
                  key={`list_comments_${product?._id}_${comments.length}`}
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
