import '../index.less';
import { PureComponent } from 'react';
import { Input, Form, Button, message, Select, Alert } from 'antd';
import Head from 'next/head';
import Page from '@components/common/layout/page';
import { getResponseError, validateMessages } from 'src/lib';
import { authService } from 'src/services';
import { connect } from 'react-redux';
import { IUIConfig } from 'src/interfaces';
import { FormRegisterPlaceHolder } from '@components/common/layout';

import { withTranslation } from '../../../i18n';

interface P {
  ui: IUIConfig;
  t: any;
}

interface S {
  submiting: boolean;
  errorMessage: string;
  error: boolean;
}

class ResendVeryficationEmail extends PureComponent<P, S> {
  static layout: string = 'auth';

  constructor(props: P) {
    super(props);
    this.state = {
      submiting: false,
      error: false,
      errorMessage: ''
    };
  }

  async submit(data) {
    try {
      this.setState({ error: false, errorMessage: '' });
      await authService.resendVerificationEmail(data);
      message.success(
        `${this.props.t(
          'Verification email have been sent. Please check your inbox or spam box'
        )}!`
      );
    } catch (e) {
      const error = await Promise.resolve(e);
      this.setState({ error: true, errorMessage: getResponseError(error) });
    }
  }

  render() {
    const { submiting, error, errorMessage } = this.state;
    const { ui, t } = this.props;
    return (
      <>
        <Head>
          <title>{t('Resend Verification Email')}</title>
        </Head>
        <Page className="register-page resend-verification-email-page" inner>
          <div className="form-register-container">
            <Form
              onFinish={this.submit.bind(this)}
              layout="vertical"
              validateMessages={validateMessages}
            >
              <h1>{t('Resend Verification Email')}</h1>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: t('Please input your email') },
                  { type: 'email', message: t('The input is not valid E-mail') }
                ]}
              >
                <Input type="email" placeholder="E-mail" />
              </Form.Item>
              <Form.Item name="source" rules={[{ required: true }]}>
                <Select placeholder="You are?">
                  <Select.Option value="user">{t('User')}</Select.Option>
                  <Select.Option value="performer">
                    {t('Performer')}
                  </Select.Option>
                  <Select.Option value="studio">{t('Studio')}</Select.Option>
                </Select>
              </Form.Item>
              {error && (
                <Form.Item>
                  <Alert
                    showIcon
                    type="error"
                    description={errorMessage}
                    message={t('Error')}
                  />
                </Form.Item>
              )}
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submiting}
                  disabled={submiting}
                >
                  {t('Submit')}
                </Button>
              </Form.Item>
            </Form>
          </div>
          <FormRegisterPlaceHolder ui={ui} />
        </Page>
      </>
    );
  }
}

const mapStateToProps = (state) => ({ ui: state.ui });
export default connect(mapStateToProps)(
  withTranslation('common')(ResendVeryficationEmail)
);
