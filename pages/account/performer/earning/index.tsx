import React, { PureComponent } from 'react';
import { DatePicker, Space, Statistic, Row, Col } from 'antd';
import PageHeader from '@components/common/layout/page-header';
import Head from 'next/head';
import { connect } from 'react-redux';
import { getEarning } from '@redux/performer/actions';
import { ISearch, IPerformer } from 'src/interfaces';
import EarningHistoryTable from '@components/performer/earning-history-table';
import { getSearchData, defaultColor } from 'src/lib';
import { IEarning } from 'src/interfaces/earning';
import NumberFormat from '@components/common/layout/numberformat';

import './index.less';
import { withTranslation } from '../../../../i18n';

interface IProps {
  data: IEarning[];
  error: any;
  stats: any;
  performer: IPerformer;
  total: number;
  searching: boolean;
  success: boolean;
  getEarning: Function;
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
    const { getEarning: dispatchGetEarning } = this.props;
    dispatchGetEarning(this.state);
  }

  componentDidUpdate(_, prevStates: IStates) {
    const { getEarning: dispatchGetEarning } = this.props;
    if (prevStates !== this.state) {
      dispatchGetEarning(this.state);
    }
  }

  onChange(pagination, filters, sorter) {
    const oldState = { ...this.state };
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
    const { data, searching, total, performer, stats, success, t } = this.props;
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
                  <NumberFormat value={performer.balance || 0} />
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
                    decimalSeparator=","
                    groupSeparator="."
                  />
                  <Statistic
                    title={t('Remaining Tokens')}
                    value={stats.data.remainingPrice}
                    precision={2}
                    decimalSeparator=","
                    groupSeparator="."
                  />
                  <Statistic
                    title={t('Total Tokens')}
                    value={stats.data.totalPrice}
                    precision={2}
                    decimalSeparator=","
                    groupSeparator="."
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
  ...state.performer.earning,
  // earning: state.performer.earning.data,
  performer: state.performer.current
});
const mapDispatch = { getEarning };
// export default connect(mapStateToProps, mapDispatch)(PerformerProductsPage);
export default connect(
  mapStateToProps,
  mapDispatch
)(withTranslation()(PerformerProductsPage));
