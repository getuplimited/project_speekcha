/* eslint-disable no-return-assign */
import { Input, message } from 'antd';
import PageHeader from '@components/common/layout/page-header';
import Head from 'next/head';
import {
  getMembersCommissions,
  updateMemberCommision
} from 'src/redux/studio/actions';
import React, { PureComponent } from 'react';
import { IPerformer, ISearch } from 'src/interfaces';
import StudioCommissionsTable from '@components/studio/models-manager/studio-commissions-table';
import { connect } from 'react-redux';
import './index.less';
import { getResponseError, getSearchData } from 'src/lib';
import Popup from '@components/common/base/popup';
import { studioService } from 'src/services';

import { withTranslation } from '../../../i18n';

interface IProps {
  data: IPerformer[];
  total: number;
  success: boolean;
  searching: boolean;
  error: any;
  getMembersCommissions: Function;
  updateMemberCommision: Function;
  t: any;
}
interface IState extends ISearch {
  limit: number;
  offset: number;
  sortBy: string;
  sort: string;
  filter?: any;
  commissionId?: any;
}

class StudioModelsPage extends PureComponent<IProps, IState> {
  static authenticate = 'studio';

  static layout = 'primary';

  private popupRef;

  private inputRef;

  constructor(props: IProps) {
    super(props);
    this.state = {
      limit: 12,
      offset: 0,
      sortBy: 'createdAt',
      sort: 'desc',
      filter: {},
      commissionId: null
    };
  }

  componentDidMount() {
    const { getMembersCommissions: dispatchGetMembersCommissions } = this.props;
    dispatchGetMembersCommissions(this.state);
  }

  componentDidUpdate(_, prevStates: IState) {
    const { getMembersCommissions: dispatchGetMembersCommissions } = this.props;
    if (prevStates !== this.state) {
      dispatchGetMembersCommissions(this.state);
    }
  }

  handleTableChange(pagination, filters, sorter) {
    const oldState = this.state;
    this.setState(getSearchData(pagination, filters, sorter, oldState));
  }

  async onOk() {
    const { updateMemberCommision: dispatchUpdateMemberCommision } = this.props;
    const { commissionId } = this.state;
    if (!commissionId || !this.inputRef) return;

    try {
      const { value } = this.inputRef.state;
      await studioService.updateMemberCommission(
        commissionId,
        parseInt(value, 10)
      );
      dispatchUpdateMemberCommision({
        id: commissionId,
        memberCommission: parseInt(value, 10)
      });
      message.success(this.props.t('Update success'));
      this.popupRef && this.popupRef.setVisible(false);
    } catch (e) {
      const err = await Promise.resolve(e);
      message.error(getResponseError(err));
    }
  }

  update(id) {
    this.setState({ commissionId: id });
    this.popupRef && this.popupRef.setVisible(true);
  }

  render() {
    const { data, searching, total, t } = this.props;
    const { limit } = this.state;
    return (
      <>
        <Head>
          <title>{t('Commissions')}</title>
        </Head>
        <Popup
          ref={(ref) => (this.popupRef = ref)}
          content={
            <Input
              type="number"
              min={0}
              max={100}
              ref={(ref) => (this.inputRef = ref)}
            />
          }
          onOk={this.onOk.bind(this)}
        />
        <div className="studio-commisson-background">
          <PageHeader title={t('Commissions')} />
          <div className="studio-commisson-box">
            <StudioCommissionsTable
              data={data}
              searching={searching}
              total={total}
              update={this.update.bind(this)}
              onChange={this.handleTableChange.bind(this)}
              pageSize={limit}
            />
          </div>
        </div>
      </>
    );
  }
}

const mapStateToProps = (state) => ({ ...state.studio.commissions });
const mapDispatchs = { getMembersCommissions, updateMemberCommision };
export default connect(
  mapStateToProps,
  mapDispatchs
)(withTranslation('common')(StudioModelsPage));
