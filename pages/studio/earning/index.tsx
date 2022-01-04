import React, { PureComponent } from 'react';
import { DatePicker, Space, Statistic, Row, Col } from 'antd';
import PageHeader from '@components/common/layout/page-header';
import Head from 'next/head';
import { connect } from 'react-redux';
import { getStudioEarning } from '@redux/studio/actions';
import { ISearch, IStudio } from 'src/interfaces';
import EarningHistoryTable from '@components/performer/earning-history-table';
import { getSearchData, defaultColor } from 'src/lib';
import { IEarning } from 'src/interfaces/earning';

import './index.less';
import { withTranslation } from '../../../i18n';

interface IProps {
  data: IEarning[];
  error: any;
  stats: any;
  studio: IStudio;
  total: number;
  searching: boolean;
  success: boolean;
  getStudioEarning: Function;
  t: any;
}

interface IStates extends ISearch {
  fromDate?: string;
  toDate?: string;
}

class PerformerProductsPage extends PureComponent<IProps, IStates> {
  static authenticate = true;

  static layout = 'primary';

  constructor(props: IProps) {
    super(props);
    this.state = {
      limit: 10,
      offset: 0,
      sortBy: 'createdAt',
      sort: 'desc'
    };
  }

  componentDidMount() {
    const { getStudioEarning: dispatchGetStudioEarning } = this.props;
    dispatchGetStudioEarning(this.state);
  }

  componentDidUpdate(_, prevStates: IStates) {
    const { getStudioEarning: dispatchGetStudioEarning } = this.props;
    if (prevStates !== this.state) {
      dispatchGetStudioEarning(this.state);
    }
  }

  onChange(pagination, filters, sorter) {
    const oldState = this.state;
    this.setState(getSearchData(pagination, filters, sorter, oldState));
  }

  setDateRanger(_, dateStrings: string[]) {
    if (!dateStrings[0] && !dateStrings[1]) {
      this.setState({
        toDate: null,
        fromDate: null,
        sortBy: 'createdAt',
        sort: 'desc'
      });
      return;
    }

    if (!dateStrings[0] || !dateStrings[1]) return;
    this.setState({ fromDate: dateStrings[0], toDate: dateStrings[1] });
  }

  render() {
    const { data, searching, total, studio, stats, success, t } = this.props;
    const { limit } = this.state;
    return (
      <>
        <Head>
          <title>{t('Earnings')}</title>
        </Head>
        <div className="earning-history-page">
          <PageHeader title={t('My Earning')} />
          <Row className="ant-page-header">
            <Col md={12} xs={24}>
              <Space>
                <span>{t('My Balance')}:</span>
                <span style={{ color: defaultColor.primaryColor }}>
                  {studio.balance?.toFixed(2)} {t('tokens')}
                </span>
              </Space>
              <div>
                <DatePicker.RangePicker
                  disabledDate={() => searching}
                  onCalendarChange={this.setDateRanger.bind(this)}
                />
              </div>
            </Col>
            <Col md={12} xs={24}>
              {success && stats && (
                <Space size="large">
                  <Statistic
                    title={t('Paid Tokens')}
                    value={stats.data.paidPrice}
                    precision={2}
                  />
                  <Statistic
                    title={t('Remaining Tokens')}
                    value={stats.data.remainingPrice}
                    precision={2}
                  />
                  <Statistic
                    title={t('Total Tokens')}
                    value={stats.data.totalPrice}
                    precision={2}
                  />
                </Space>
              )}
            </Col>
          </Row>
          <EarningHistoryTable
            earnings={data}
            searching={searching}
            total={total}
            pageSize={limit}
            onChange={this.onChange.bind(this)}
          />
        </div>
      </>
    );
  }
}

const mapStateToProps = (state) => ({
  ...state.studio.earning,
  studio: state.studio.current
});
const mapDispatch = { getStudioEarning };
export default connect(
  mapStateToProps,
  mapDispatch
)(withTranslation('common')(PerformerProductsPage));
