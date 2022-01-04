/* eslint-disable no-prototype-builtins */
import { PureComponent } from 'react';
import { Menu, Dropdown, message } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { reactionService } from '@services/index';
import moment from 'moment';
import { connect } from 'react-redux';
import { ListComments } from '@components/comment';
import {
  getComments, moreComment, createComment, deleteComment
} from '@redux/comment/actions';
import { IUser } from 'src/interfaces';
import { IComment } from '../../interfaces/comment';

interface IProps {
  item: IComment;
  comment: any;
  onDelete?: Function;
  user?: IUser;
  canReply?: boolean;
  getComments: Function;
  moreComment: Function;
  createComment: Function;
  deleteComment: Function;
  commentMapping: any;
}

class CommentItem extends PureComponent<IProps> {
  state = {
    isLiked: false,
    isOpenComment: false,
    isFirstLoadComment: true,
    itemPerPage: 10,
    commentPage: 0,
    totalReply: 0,
    totalLike: 0
  }

  componentDidMount() {
    const { item } = this.props;
    if (item) {
      this.setState({
        isLiked: !!item.isLiked,
        totalLike: item.totalLike || 0,
        totalReply: item.totalReply ? item.totalReply : 0
      });
    }
  }

  async handleComment(values) {
    const { createComment: handleCreate } = this.props;
    const { totalReply } = this.state;
    handleCreate(values);
    await this.setState({ isOpenComment: false, totalReply: totalReply + 1 });
    this.onOpenComment();
  }

  async onOpenComment() {
    const { item, getComments: handleGetComment } = this.props;
    const {
      isOpenComment, isFirstLoadComment, itemPerPage, commentPage
    } = this.state;
    this.setState({ isOpenComment: !isOpenComment });
    if (isFirstLoadComment) {
      await this.setState({ isFirstLoadComment: false });
      handleGetComment({
        objectId: item._id,
        objectType: 'comment',
        limit: itemPerPage,
        offset: commentPage
      });
    }
  }

  async onLikeComment(comment) {
    const { isLiked, totalLike } = this.state;
    try {
      if (!isLiked) {
        await reactionService.create({
          objectId: comment._id,
          action: 'like',
          objectType: 'comment'
        });
        this.setState({ isLiked: true, totalLike: totalLike + 1 });
      } else {
        await reactionService.delete({
          objectId: comment._id,
          action: 'like',
          objectType: 'comment'
        });
        this.setState({ isLiked: false, totalLike: totalLike - 1 });
      }
    } catch (e) {
      const error = await e;
      message.error(error.message || 'Error occured, please try again later');
    }
  }

  async moreComment() {
    const { item, moreComment: handleLoadMore } = this.props;
    const { commentPage, itemPerPage } = this.state;
    await this.setState({
      commentPage: commentPage + 1
    });
    handleLoadMore({
      limit: itemPerPage,
      objectType: 'comment',
      offset: (commentPage + 1) * itemPerPage,
      objectId: item._id
    });
  }

  async deleteComment(item) {
    const { deleteComment: handleDelete } = this.props;
    if (!window.confirm('Are you sure to remove this comment?')) return;
    handleDelete(item._id);
  }

  render() {
    const {
      item, user, onDelete, commentMapping
    } = this.props;
    const fetchingComment = commentMapping.hasOwnProperty(item._id) ? commentMapping[item._id].requesting : false;
    const comments = commentMapping.hasOwnProperty(item._id) ? commentMapping[item._id].items : [];
    const totalComments = commentMapping.hasOwnProperty(item._id) ? commentMapping[item._id].total : 0;
    const {
      isOpenComment
    } = this.state;
    return (
      <div>
        <div className="cmt-item" key={item._id}>
          <img alt="creator-avt" src={item?.creator?.avatar || '/no-avatar.png'} />
          <div className="cmt-content">
            <div className="cmt-user">
              <span>
                <span>{item?.creator?.username || item?.creator?.name || 'N/A'}</span>
                <span className="cmt-time">{moment(item.createdAt).fromNow()}</span>
              </span>
              {user._id === item.createdBy && (
                <Dropdown overlay={(
                  <Menu key={`menu_cmt_${item._id}`}>
                    <Menu.Item key={`delete_cmt_${item._id}`} onClick={() => onDelete(item)}>
                      <a>
                        Delete
                      </a>
                    </Menu.Item>
                  </Menu>
                )}
                >
                  <a aria-hidden className="ant-dropdown-link" onClick={(e) => e.preventDefault()}>
                    <MoreOutlined />
                  </a>
                </Dropdown>
              )}
            </div>
            <p className="cmt-text">{item.content}</p>
          </div>
        </div>
        {isOpenComment && (
          <div className="reply-bl-list">
            <div>
              <ListComments
                key={`list_comments_${item._id}_${comments.length}`}
                requesting={fetchingComment}
                comments={comments}
                total={totalComments}
                onDelete={this.deleteComment.bind(this)}
                user={user}
                canReply={false}
              />
              {comments.length < totalComments && <p className="text-center"><a aria-hidden onClick={this.moreComment.bind(this)}>more...</a></p>}
            </div>
          </div>
        )}
      </div>
    );
  }
}

const mapStates = (state: any) => {
  const { commentMapping, comment } = state.comment;
  return {
    commentMapping,
    comment
  };
};

const mapDispatch = {
  getComments, moreComment, createComment, deleteComment
};
export default connect(mapStates, mapDispatch)(CommentItem);
