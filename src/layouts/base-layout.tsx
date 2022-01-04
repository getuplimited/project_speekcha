import * as React from 'react';
import { IUIConfig } from 'src/interfaces';
import dynamic from 'next/dynamic';
import { connect } from 'react-redux';
import PrimaryLayout from './primary-layout';
import PublicLayout from './public-layout';
import DefaultLayout from './default-layout';
import AuthLayout from './auth-layout';
import MaintenanceLayout from './maintenance-layout';

const CookiePolicy = dynamic(
  () => import('src/components/common/layout/cookie-policy'),
  { ssr: false }
);

interface DefaultProps {
  children: any;
  appConfig?: IUIConfig;
  layout?: string;
  maintenanceMode?: boolean;
}

interface DefaultStates {
  cookiePolicyVisible: boolean;
}

const LayoutMap = {
  maintenance: MaintenanceLayout,
  primary: PrimaryLayout,
  public: PublicLayout,
  auth: AuthLayout,
  default: DefaultLayout
};

class BaseLayout extends React.PureComponent<DefaultProps, DefaultStates> {
  state = {
    cookiePolicyVisible: false
  };

  componentDidMount() {
    const {
      appConfig: { cookiePolicyEnabled }
    } = this.props;
    this.acceptCookiePolicy = this.acceptCookiePolicy.bind(this);
    const cookiePolicy = localStorage.getItem('cookiePolicy');
    if (!cookiePolicy && cookiePolicyEnabled) {
      this.setState({
        cookiePolicyVisible: true
      });
    }
  }

  acceptCookiePolicy() {
    localStorage.setItem('cookiePolicy', 'true');
    this.setState({ cookiePolicyVisible: false });
  }

  render() {
    const {
      children,
      layout,
      maintenanceMode = false,
      appConfig: { cookiePolicyContentId }
    } = this.props;
    const { cookiePolicyVisible } = this.state;
    if (maintenanceMode) {
      return <MaintenanceLayout />;
    }

    const Container = layout && LayoutMap[layout] ? LayoutMap[layout] : LayoutMap.public;
    return (
      <>
        <Container>{children}</Container>
        <CookiePolicy
          hidden={!cookiePolicyVisible}
          onOk={this.acceptCookiePolicy}
          pId={cookiePolicyContentId}
        />
      </>
    );
  }
}

const mapStateToProps = (state) => ({ appConfig: state.ui });
export default connect(mapStateToProps)(BaseLayout);
