/* eslint-disable react/react-in-jsx-scope */
import { Layout } from 'antd';
import { Fragment, PureComponent } from 'react';
import { connect } from 'react-redux';
import Head from 'next/head';
import { IUIConfig } from 'src/interfaces/';
import Messenger from '@components/messages/Messenger';
import { resetMessageState } from '@redux/message/actions';

import { withTranslation } from '../../i18n';

interface IProps {
  ui: IUIConfig;
  getList: Function;
  query: Record<string, string>;
  resetMessageState: Function;
  t: any;
}

const { Content } = Layout;
class Messages extends PureComponent<IProps> {
  static authenticate = true;

  static layout = 'primary';

  static getInitialProps({ ctx }) {
    return {
      query: ctx.query
    };
  }

  componentWillUnmount() {
    const { resetMessageState: resetStateHandler } = this.props;
    resetStateHandler();
  }

  render() {
    const { query = {}, t } = this.props;
    return (
      <>
        <Head>
          <title>{t('Messages')}</title>
        </Head>
        <Layout>
          <Content>
            <div className="main-container">
              <Messenger toSource={query.toSource} toId={query.toId} />
            </div>
          </Content>
        </Layout>
      </>
    );
  }
}

const mapStates = (state: any) => ({
  ui: { ...state.ui }
});

const mapDispatch = { resetMessageState };
export default connect(
  mapStates,
  mapDispatch
)(withTranslation('common')(Messages));
