import { message, Checkbox, Table, Tabs, Button } from 'antd';
import PageHeader from '@components/common/layout/page-header';
import Head from 'next/head';
import React, { PureComponent } from 'react';
import { performerService } from 'src/services';
import { getResponseError } from '@lib/utils';
import { connect } from 'react-redux';
import './index.less';
import { ICountries } from 'src/interfaces';

import { withTranslation } from '../../../../i18n';

interface IProps {
  countries: ICountries[];
  t: any;
}
interface IStates {
  blockedCountries: any[];
  blockedUsers?: any[];
  isLoading: boolean;
  isBlocking: boolean;
}

class PerformerGeoBlockPage extends PureComponent<IProps, IStates> {
  static authenticate = true;

  static layout = 'primary';

  constructor(props) {
    super(props);
    this.state = {
      blockedCountries: [],
      blockedUsers: [],
      isLoading: false,
      isBlocking: false
    };
  }

  componentDidMount() {
    this.search();
  }

  componentDidUpdate(_, prevState: IStates) {
    const { blockedCountries, isBlocking } = this.state;
    if (isBlocking && blockedCountries !== prevState.blockedCountries) {
      this.blockCountry(blockedCountries);
    }
  }

  handleBlockCountry(code, event) {
    this.setState({ isBlocking: true });
    const { blockedCountries } = this.state;
    if (event.target && event.target.checked) {
      // performerService.geoBlock({ countries: blockedCountries });
      this.setState({ blockedCountries: [...blockedCountries, code] });
    } else {
      this.setState({
        blockedCountries: blockedCountries.filter((c) => code !== c)
      });
    }
  }

  async handleBlockUser(userId) {
    if (!window.confirm(this.props.t('Are you sure?'))) return;
    const { blockedUsers } = this.state;
    try {
      const user = blockedUsers.find((u) => u._id === userId);
      blockedUsers.splice(user, 1);
      await this.setState((state) => {
        const list = state.blockedUsers.splice(user, 1);
        return { ...state, ...{ blockedUsers: list } };
      });
      performerService.geoBlock({
        userIds: blockedUsers.length ? blockedUsers.map((b) => b._id) : []
      });
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(
        error || this.props.t('Something went wrong, please try again later')
      );
    }
  }

  async search() {
    try {
      this.setState({ isLoading: true });
      const resp = await performerService.getBlockedList();
      this.setState({
        blockedCountries: resp.data.countries || [],
        blockedUsers: resp.data.usersInfo || []
      });
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(
        getResponseError(
          error || this.props.t('An error occurred, please try again!')
        )
      );
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async blockCountry(blockedCountries) {
    try {
      await performerService.geoBlock({ countries: blockedCountries });
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(
        error || this.props.t('Something went wrong, please try again later')
      );
    } finally {
      this.setState({ isBlocking: false });
    }
  }

  render() {
    const { countries, t } = this.props;
    const { isLoading, isBlocking, blockedCountries, blockedUsers } =
      this.state;
    const countriesColumns = [
      {
        title: t('Country'),
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: t('Coutry Code'),
        dataIndex: 'code',
        key: 'code'
      },
      {
        title: t('Flag'),
        dataIndex: 'flag',
        key: 'flag',
        render: (flag) => <img src={flag} width="50px" alt="" />
      },
      {
        title: '#',
        dataIndex: 'code',
        key: 'check',
        render: (code) => (
          <Checkbox
            disabled={isBlocking}
            defaultChecked={
              !!(
                blockedCountries.length > 0 &&
                blockedCountries.find((c) => c === code)
              )
            }
            onChange={this.handleBlockCountry.bind(this, code)}
          />
        )
      }
    ];
    const usersColumns = [
      {
        title: '# ',
        dataIndex: '_id',
        key: 'avatar',
        render: (avatar, record) => (
          <img
            src={record?.avatar || '/default-user-icon.png'}
            width="50px"
            alt=""
          />
        )
      },
      {
        title: t('Name'),
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: t('Username'),
        dataIndex: 'username',
        key: 'username'
      },
      {
        title: '#',
        dataIndex: '_id',
        key: 'check',
        render: (id) => (
          <div>
            <Button onClick={this.handleBlockUser.bind(this, id)}>
              {t('Unblock')}
            </Button>
          </div>
        )
      }
    ];
    return (
      <>
        <Head>
          <title>{t('Blocking')}</title>
        </Head>
        <div className="geo-blocking-page">
          <PageHeader title={t('Blocking')} />
          <Tabs defaultActiveKey="geo-block">
            <Tabs.TabPane tab={t('GEO Blocking')} key="geo-block">
              <div>
                {countries && countries.length > 0 && !isLoading ? (
                  <Table
                    pagination={false}
                    dataSource={countries.map((c, index) => ({
                      ...c,
                      key: `key-country-${index}`
                    }))}
                    columns={countriesColumns}
                  />
                ) : (
                  <p className="text-center">{t('loading')}...</p>
                )}
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Black list users')} key="user-block">
              <div>
                {!isLoading ? (
                  <Table
                    pagination={false}
                    dataSource={blockedUsers.map((c, index) => ({
                      ...c,
                      key: `key-country-${index}`
                    }))}
                    columns={usersColumns}
                  />
                ) : (
                  <p className="text-center">{t('loading')}...</p>
                )}
              </div>
            </Tabs.TabPane>
          </Tabs>
        </div>
      </>
    );
  }
}

const mapStateToProps = (state) => ({ countries: state.settings.countries });
// export default connect(mapStateToProps)(PerformerGeoBlockPage);
export default connect(mapStateToProps)(
  withTranslation()(PerformerGeoBlockPage)
);
