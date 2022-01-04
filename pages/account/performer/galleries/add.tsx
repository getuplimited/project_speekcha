import React, { PureComponent } from 'react';
import { message } from 'antd';
import PageHeader from '@components/common/layout/page-header';
import Head from 'next/head';
import { connect } from 'react-redux';
import Form from '@components/photos/gallery-form';
import { galleryService } from 'src/services';
import { getResponseError } from '@lib/utils';
import { IPerformer } from 'src/interfaces';
import Router from 'next/router';

import './index.less';
import { withTranslation } from '../../../../i18n';

interface IProps {
  performer: IPerformer;
  t: any;
}

interface IStates {
  onSubmit: boolean;
}

class CreatePerformerGalleryPage extends PureComponent<IProps, IStates> {
  static authenticate = true;

  static layout = 'primary';

  constructor(props: IProps) {
    super(props);
    this.state = {
      onSubmit: false
    };
  }

  async onFinish(data) {
    const { performer } = this.props;
    try {
      this.setState({ onSubmit: true });
      await galleryService.create({
        ...data,
        performerId: performer._id,
        token: parseInt(data.token, 10)
      });
      message.success(this.props.t('Add gallery success.'));
      Router.back();
    } catch (e) {
      const err = await Promise.resolve(e);
      message.error(getResponseError(err));
    } finally {
      this.setState({ onSubmit: false });
    }
  }

  render() {
    const { onSubmit } = this.state;
    const { t } = this.props;
    return (
      <>
        <Head>
          <title>{t('New Gallery')}</title>
        </Head>
        <div className="performer-gallries-page">
          <PageHeader title={t('Create new Gallery')} />
          <Form
            loading={onSubmit}
            onFinish={this.onFinish.bind(this)}
            gallery={{}}
          />
        </div>
      </>
    );
  }
}

const mapStateToProps = (state) => ({
  performer: state.performer.current
});
// export default connect(mapStateToProps)(CreatePerformerGalleryPage);
export default connect(mapStateToProps)(
  withTranslation()(CreatePerformerGalleryPage)
);
