/* eslint-disable react/no-unescaped-entities */
import React, { PureComponent } from 'react';
import { Row, Col } from 'antd';
import PageHeader from '@components/common/layout/page-header';
import Head from 'next/head';
import Link from 'next/link';
import { getMembers, updateMemberStatus } from 'src/redux/studio/actions';

import { IPerformer, ISearch } from 'src/interfaces';
import StudioModelsSearch from '@components/studio/models-manager/search-online-status';
import StudioModelsTable from '@components/studio/models-manager/studio-models-table';
import { connect } from 'react-redux';

import './index.less';
import { withTranslation } from '../../../i18n';

import { getSearchData } from 'src/lib';

interface IProps {
  data: IPerformer[];
  total: number;
  success: boolean;
  searching: boolean;
  error: any;
  updateMemberStatus: Function;
  getMembers: Function;
  placeholderAvatarUrl: string;
  t: any;
}
interface IState extends ISearch {
  limit: number;
  offset: number;
  sortBy: string;
  sort: string;
  filter?: any;
}

class StudioModelsPage extends PureComponent<IProps, IState> {
  static authenticate = 'studio';

  static layout = 'primary';

  constructor(props: IProps) {
    super(props);
    this.state = {
      limit: 12,
      offset: 0,
      sortBy: 'createdAt',
      sort: 'desc',
      filter: {}
    };
  }

  componentDidMount() {
    const { getMembers: dispatchGetMembers } = this.props;
    dispatchGetMembers(this.state);
  }

  componentDidUpdate(_, prevStates: IState) {
    const { getMembers: dispatchGetMembers } = this.props;
    if (prevStates !== this.state) {
      dispatchGetMembers(this.state);
    }
  }

  handleTableChange(pagination, filters, sorter) {
    const oldState = this.state;
    this.setState(getSearchData(pagination, filters, sorter, oldState));
  }

  onSearch(data) {
    this.setState(data);
  }

  render() {
    const {
      data,
      searching,
      total,
      updateMemberStatus: updateMember,
      placeholderAvatarUrl,
      t
    } = this.props;
    const { limit } = this.state;
    return (
      <>
        <Head>
          <title>{t("Studio's Models")}</title>
        </Head>
        <div className="studio-models-background">
          <PageHeader
            title={t('Models')}
            extra={
              <Link href="/studio/models/add">
                <a>{t('Add new member')}</a>
              </Link>
            }
          />
          <div className="studio-models-box">
            <Row>
              <Col xs={24} sm={12}>
                <StudioModelsSearch
                  searching={searching}
                  onSearch={this.onSearch.bind(this)}
                />
              </Col>
              <Col xs={24} sm={12} />
            </Row>
            <StudioModelsTable
              data={data}
              searching={searching}
              total={total}
              updateMemberStatus={updateMember}
              onChange={this.handleTableChange.bind(this)}
              pageSize={limit}
              placeholderAvatarUrl={placeholderAvatarUrl}
            />
          </div>
        </div>
      </>
    );
  }
}

const mapStateToProps = (state) => ({
  ...state.studio.members,
  placeholderAvatarUrl: state.ui.placeholderAvatarUrl
});
const mapDispatchs = { getMembers, updateMemberStatus };
export default connect(
  mapStateToProps,
  mapDispatchs
)(withTranslation('common')(StudioModelsPage));
