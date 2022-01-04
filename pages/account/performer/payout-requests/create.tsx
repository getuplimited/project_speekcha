import React from 'react';
import Head from 'next/head';
import PayoutRequestForm from '@components/payout-request/form';
import { message } from 'antd';
import PageHeader from '@components/common/layout/page-header';
import './index.less';
import { payoutRequestService } from 'src/services';
import { Moment } from 'moment';
import Router from 'next/router';

import { withTranslation } from '../../../../i18n';

interface Props {
  t: any;
}

interface States {
  submitting: boolean;
  // success: boolean;
}

class PayoutRequestCreatePage extends React.PureComponent<Props, States> {
  static layout = 'primary';

  static authenticate = true;

  constructor(props: Props) {
    super(props);
    this.state = {
      submitting: false
      // success: false
    };
  }

  async submit(data: {
    date: Moment[];
    paymentAccountType: string;
    requestNote: string;
  }) {
    if (!data.date[0] || !data.date[1]) return;

    try {
      this.setState({ submitting: true });
      const body = {
        paymentAccountType: data.paymentAccountType,
        requestNote: data.requestNote,
        sourceType: 'performer',
        fromDate: data.date[0],
        toDate: data.date[1]
      };
      await payoutRequestService.create(body);
      message.success(this.props.t('Create Success!'));
      Router.push('/account/performer/payout-requests');
    } catch (e) {
      const error = await Promise.resolve(e);
      message.error(error);
    } finally {
      this.setState({ submitting: false });
    }
  }

  render() {
    const { submitting } = this.state;
    const { t } = this.props;
    return (
      <>
        <Head>
          <title>{t('Payout Request')}</title>
        </Head>
        <div className="payout-request-page">
          <PageHeader title={t('Create a Payout Request')} />
          <PayoutRequestForm
            payout={{}}
            submit={this.submit.bind(this)}
            submitting={submitting}
          />
        </div>
      </>
    );
  }
}

// export default PayoutRequestCreatePage;
export default withTranslation()(PayoutRequestCreatePage);
