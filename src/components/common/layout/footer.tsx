/* eslint-disable react/no-danger */
import './footer.less';
import { PureComponent } from 'react';
import { Layout, Divider } from 'antd';
import { IUIConfig } from 'src/interfaces';
import { connect } from 'react-redux';

interface IProps {
  ui: IUIConfig;
}
class Footer extends PureComponent<IProps> {
  render() {
    const { ui } = this.props;
    const { menus = [], siteName } = ui;
    return (
      <Layout.Footer id="layoutFooter">
        <div className="footer-custom">
          <Divider />
          {menus?.map((menu) => (
            <a
              href={menu.path || '/'}
              key={menu._id}
              className="mr-8"
              target="_blank"
              rel="noreferrer"
            >
              {menu.title}
            </a>
          ))}
          {ui?.footerContent ? (
            <div dangerouslySetInnerHTML={{ __html: ui.footerContent }} />
          ) : (
            <p>
              © Copyright
              {' '}
              {siteName}
              {' '}
              {new Date().getFullYear()}
              . All Rights Reserved
            </p>
          )}
        </div>
      </Layout.Footer>
    );
  }
}
const mapStateToProps = (state: any) => ({
  ui: { ...state.ui }
});
const mapDispatch = {};
export default connect(mapStateToProps, mapDispatch)(Footer);
