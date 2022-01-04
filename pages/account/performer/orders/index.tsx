import Head from 'next/head';
import React, { PureComponent } from 'react';
import { message } from 'antd';
import PageHeader from '@components/common/layout/page-header';
import { orderService } from '@services/index';
import { OrderSearchFilter } from '@components/order';
import OrderTableList from '@components/order/table-list';
import { connect } from 'react-redux';
import { getSearchData } from 'src/lib/utils';

import { withTranslation } from '../../../../i18n';

interface IProps {
  performerId: string;
  t: any;
}

class ModelOrderPage extends PureComponent<IProps> {
  static authenticate = true;

  static layout = 'primary';

  static async getInitialProps({ ctx }) {
    return ctx.query;
  }

  state = {
    pagination: {} as any,
    searching: false,
    list: [] as any,
    limit: 10,
    filter: {} as any,
    sortBy: 'createdAt',
    sort: 'desc'
  };

  async componentDidMount() {
    this.search();
  }

  handleTableChange = async (pagination, filters, sorter) => {
    const pager = { ...pagination };
    const oldState = { ...this.state };
    pager.current = pagination.current;
    await this.setState(getSearchData(pagination, filters, sorter, oldState));
    this.search(pager.current);
  };

  async handleFilter(filter) {
    await this.setState({ filter });
    this.search();
  }

  async search(page = 1) {
    const { filter, limit, sort, sortBy, pagination } = this.state;
    try {
      await this.setState({ searching: true });
      const resp = await orderService.search({
        ...filter,
        limit,
        offset: (page - 1) * limit,
        sort,
        sortBy
      });
      await this.setState({
        searching: false,
        list: resp.data.data,
        pagination: {
          ...pagination,
          total: resp.data.total,
          pageSize: limit
        }
      });
    } catch (e) {
      message.error(this.props.t('An error occurred, please try again!'));
      await this.setState({ searching: false });
    }
  }

  render() {
    const { list, searching, pagination } = this.state;
    const { t } = this.props;
    const statuses = [
      {
        key: 'All',
        text: t('All')
      },
      {
        key: 'processing',
        text: t('Processing')
      },
      {
        key: 'shipping',
        text: t('Shipping')
      },
      {
        key: t('delivered'),
        text: t('Delivered')
      },
      {
        key: 'refunded',
        text: t('Refunded')
      }
    ];

    return (
      <>
        <Head>
          <title>{t('My Orders')}</title>
        </Head>
        <div className="transaction-history-page">
          <PageHeader title={t('My Orders')} />
          <div>
            <OrderSearchFilter
              statuses={statuses}
              onSubmit={this.handleFilter.bind(this)}
            />
            <OrderTableList
              type="performer"
              dataSource={list}
              rowKey="_id"
              loading={searching}
              pagination={pagination}
              onChange={this.handleTableChange.bind(this)}
            />
          </div>
        </div>
      </>
    );
  }
}

const mapStates = (state: any) => ({
  ui: state.ui
});
// export default connect(mapStates)(ModelOrderPage);
export default connect(mapStates)(withTranslation()(ModelOrderPage));
