import React, { PureComponent } from 'react';
import { message, Tabs, Form, Button, Collapse } from 'antd';
import PageHeader from '@components/common/layout/page-header';
import { connect } from 'react-redux';
import {
  ICountries,
  IPerformer,
  IUpdatePasswordFormData,
  PAYMENT_ACCOUNT
} from 'src/interfaces';
import Head from 'next/head';
import ContactSettingForm from '@components/performer/contact-setting-form';
import {
  WireTransferSettingForm,
  PaypalSettingFrom,
  IssueCheckUSSetingForm,
  DirectDepositSettingForm,
  BitpaySettigForm,
  PaxumSettingForm
} from '@components/payment';
import CommissionCard from '@components/commission/commission-card';
import DisableAccountForm from '@components/performer/settings/disable-account-form';
import DefaultPriceForm from '@components/performer/settings/default-price-form';
import {
  updatePerformerProfile,
  updatePaymentInfo,
  updateDirectDeposit,
  updateBitpay,
  updatePaxum,
  updateDefaultPrice
} from 'src/redux/performer/actions';
import { updatePassword, logout } from 'src/redux/auth/actions';
import { getResponseError } from '@lib/utils';
import {
  performerService,
  authService,
  paymentInformationService
} from 'src/services';
import Router from 'next/router';
import PasswordChange from '@components/auth/password-change';
import DocumentsSettingForm from '@components/performer/documents-setting-form';
import Timezones from '@components/common/base/select/timezones';
import { formItemLayout } from '@lib/layout';
import BroadcastSetting from '@components/performer/broadcast-setting-form';

import './index.less';
import { SocketContext } from 'src/socket';
import { withTranslation } from '../../../../i18n';

const { Panel } = Collapse;

interface IProps {
  performer: IPerformer;
  countries: ICountries[];
  action: string;
  auth: any;
  updatePerformerProfile: Function;
  updatePaymentInfo: Function;
  updateDirectDeposit: Function;
  updateBitpay: Function;
  updatePaxum: Function;
  updatePassword(data: IUpdatePasswordFormData): Function;
  updating: boolean;
  updateSuccess: boolean;
  updateError: any;
  updateDefaultPrice: Function;
  logout: Function;
  t: any;
}
interface IStates {
  updatingMaxPearticipantsAllowed: boolean;
  paymentInformationKey: string;
  paymentInformation: Record<string, any>;
}

class UserProfilePage extends PureComponent<IProps, IStates> {
  static authenticate = true;

  static layout = 'primary';

  static getInitialProps({ ctx }) {
    const { query } = ctx;
    return {
      action: query.action
    };
  }

  constructor(props: IProps) {
    super(props);
    this.state = {
      updatingMaxPearticipantsAllowed: false,
      paymentInformationKey: '',
      paymentInformation: {}
    };
  }

  componentDidUpdate(prevProps: IProps, prevStates: IStates) {
    const { updateSuccess, updateError, auth, t } = this.props;
    const { paymentInformationKey } = this.state;
    if (prevProps.updateSuccess !== updateSuccess && updateSuccess) {
      message.success(t('Update Profile Success.'));
    }

    if (prevProps.updateError !== updateError && updateError) {
      message.error(getResponseError(updateError));
    }

    if (
      prevProps.auth.updatePassword.success !== auth.updatePassword.success &&
      auth.updatePassword.success
    ) {
      message.success(t('Update Password Success.'));
    }

    if (
      prevProps.auth.updatePassword.error !== auth.updatePassword.error &&
      auth.updatePassword.error
    ) {
      message.error(getResponseError(auth.updatePassword.error));
    }

    if (
      paymentInformationKey &&
      paymentInformationKey !== prevStates.paymentInformationKey
    ) {
      this.getPaymentInformation();
    }
  }

  onFinish(data: any) {
    const {
      performer,
      updatePerformerProfile: dispatchupdatePerformerProfile
    } = this.props;
    dispatchupdatePerformerProfile({ ...performer, ...data });
  }

  onTabsChange(key: string) {
    Router.push(
      {
        pathname: '/account/performer/account-settings',
        query: { action: key }
      },
      `/account/performer/account-settings?action=${key}`,
      { shallow: false }
    );
  }

  async onUpdateBroadcastSetting(data) {
    const { maxParticipantsAllowed } = data;
    const { t } = this.props;
    try {
      this.setState({ updatingMaxPearticipantsAllowed: true });
      await performerService.updateBroadcastSetting({ maxParticipantsAllowed });
      message.success(`${t('Update Broadcast Setting Success.')}`);
    } catch (error) {
      const err = await Promise.resolve(error);
      message.error(getResponseError(err));
    } finally {
      this.setState({ updatingMaxPearticipantsAllowed: false });
    }
  }

  onPasswordChange(data: IUpdatePasswordFormData) {
    const { updatePassword: dispatchUpdatePassword } = this.props;
    dispatchUpdatePassword(data);
  }

  onUpdateDefaultPrice(data) {
    const { updateDefaultPrice: dispatchUpdateDefaultPrice } = this.props;
    dispatchUpdateDefaultPrice(data);
  }

  async onSuspendAccount(data) {
    const { t } = this.props;
    try {
      const { performer, logout: dispatchLogout } = this.props;
      // Check password
      const auth = await authService.performerLogin({
        username: performer.username,
        password: data.password
      });
      if (!auth.data || !auth.data.token) {
        return message.error(
          t("Something's gone wrong, please try again later")
        );
      }

      await performerService.suspendAccount(performer._id);
      const socket = this.context;
      const token = authService.getToken();
      if (socket && token) {
        socket.disconnect();
      }
      dispatchLogout();
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(getResponseError(error));
    }
    return undefined;
  }

  onPaymentInformationChange(key: string) {
    this.setState({ paymentInformationKey: key });
  }

  async getPaymentInformation() {
    const { paymentInformationKey } = this.state;
    paymentInformationService
      .findOne({ type: paymentInformationKey })
      .then((resp) =>
        this.setState({
          paymentInformation: { [paymentInformationKey]: resp.data }
        })
      );
  }

  async submitPaymentInfoForm(data) {
    const { t } = this.props;
    try {
      const { paymentInformationKey } = this.state;
      const resp = await paymentInformationService.create({
        type: paymentInformationKey,
        ...data
      });
      this.setState({
        paymentInformation: { [paymentInformationKey]: resp.data }
      });
      message.success(t('Update Payment Information Success'));
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(getResponseError(error));
    }
  }

  render() {
    const { performer, action, auth, updating, countries, t } = this.props;
    const { updatingMaxPearticipantsAllowed, paymentInformation } = this.state;

    return (
      <>
        <Head>
          <title>{t('Account Settings')}</title>
        </Head>
        <div className="account-setting-page">
          <PageHeader title={t('Account Settings')} />
          <Tabs
            defaultActiveKey={action || 'commission'}
            style={{ padding: '0 24px' }}
            size="large"
            onChange={this.onTabsChange.bind(this)}
          >
            <Tabs.TabPane tab={t('Commission')} key="commission">
              <CommissionCard />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Default Price')} key="default-price">
              <DefaultPriceForm
                {...performer}
                loading={updating}
                onFinish={this.onUpdateDefaultPrice.bind(this)}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Documents')} key="documents">
              <DocumentsSettingForm
                loading={updating}
                onFinish={this.onFinish.bind(this)}
                performer={performer}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Contact Settings')} key="contact-settings">
              <ContactSettingForm
                {...performer}
                onFinish={this.onFinish.bind(this)}
                loading={updating}
                countries={countries}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Broadcast Setting')} key="broadcast-settings">
              <BroadcastSetting
                maxParticipantsAllowed={performer.maxParticipantsAllowed}
                onFinish={this.onUpdateBroadcastSetting.bind(this, t)}
                loading={updatingMaxPearticipantsAllowed}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Payment Information')} key="paymentInfo">
              <Collapse
                accordion
                onChange={this.onPaymentInformationChange.bind(this)}
              >
                <Panel
                  header={t('Wire Transfer (Free)')}
                  key="wire"
                  forceRender
                >
                  <WireTransferSettingForm
                    paymentInformation={paymentInformation.wire}
                    loading={updating}
                    onFinish={this.submitPaymentInfoForm.bind(this)}
                  />
                </Panel>
                <Panel header="Paypal" key="paypal" forceRender>
                  <PaypalSettingFrom
                    paymentInformation={paymentInformation.paypal}
                    loading={updating}
                    onFinish={this.submitPaymentInfoForm.bind(this)}
                  />
                </Panel>
                <Panel
                  header={t('Issue Check (U.S only)')}
                  key="issue_check_us"
                  forceRender
                >
                  <IssueCheckUSSetingForm
                    paymentInformation={paymentInformation.issue_check_us}
                    loading={updating}
                    onFinish={this.submitPaymentInfoForm.bind(this)}
                  />
                </Panel>
                <Panel header={t('Direct Deposit')} key="deposit" forceRender>
                  <DirectDepositSettingForm
                    paymentInformation={paymentInformation.deposit}
                    loading={updating}
                    onFinish={this.submitPaymentInfoForm.bind(this)}
                  />
                </Panel>
                <Panel header="Paxum" key={PAYMENT_ACCOUNT.PAXUM} forceRender>
                  <PaxumSettingForm
                    paymentInformation={
                      paymentInformation[PAYMENT_ACCOUNT.PAXUM]
                    }
                    loading={updating}
                    onFinish={this.submitPaymentInfoForm.bind(this)}
                  />
                </Panel>
                <Panel header="Bitpay" key={PAYMENT_ACCOUNT.BITPAY} forceRender>
                  <BitpaySettigForm
                    paymentInformation={
                      paymentInformation[PAYMENT_ACCOUNT.BITPAY]
                    }
                    loading={updating}
                    onFinish={this.submitPaymentInfoForm.bind(this)}
                  />
                </Panel>
              </Collapse>
            </Tabs.TabPane>
            <Tabs.TabPane key="timezone" tab={t('Timezone')}>
              <h3>
                {t(
                  'Sometimes the timezone is very important so make sure you alway set up it correctly. We will contact you taking into consideration the time zone and so may the performer do!'
                )}
              </h3>
              <Form
                onFinish={this.onFinish.bind(this)}
                layout="vertical"
                initialValues={{ timezone: performer.timezone }}
                {...formItemLayout}
              >
                <Form.Item
                  name="timezone"
                  key="timezone"
                  label={t('Timezone')}
                  rules={[
                    {
                      required: true,
                      message: t('Please input your timezone!')
                    }
                  ]}
                >
                  <Timezones autoFocus />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    disabled={updating}
                    loading={updating}
                    htmlType="submit"
                  >
                    {t('Save Changes')}
                  </Button>
                </Form.Item>
              </Form>
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Disable Account')} key="disable-account">
              <DisableAccountForm
                loading={updating}
                onFinish={this.onSuspendAccount.bind(this)}
              />
            </Tabs.TabPane>
            <Tabs.TabPane key="change-password" tab={t('Change Password')}>
              <PasswordChange
                onFinish={this.onPasswordChange.bind(this)}
                {...auth.updatePassword}
              />
            </Tabs.TabPane>
          </Tabs>
        </div>
      </>
    );
  }
}

UserProfilePage.contextType = SocketContext;

const mapStateToProps = (state) => ({
  performer: state.performer.current,
  updating: state.performer.updating,
  updateSuccess: state.performer.updateSuccess,
  updateError: state.performer.updateError,
  countries: state.settings.countries,
  auth: state.auth
});
const mapDispatch = {
  updatePerformerProfile,
  logout,
  updatePaymentInfo,
  updatePassword,
  updateDirectDeposit,
  updateBitpay,
  updatePaxum,
  updateDefaultPrice
};

export default connect(
  mapStateToProps,
  mapDispatch
)(withTranslation()(UserProfilePage));

// export default connect(
//   mapStateToProps,
//   mapDispatch
// )(withTranslation()(withRouter(Homepage)));
