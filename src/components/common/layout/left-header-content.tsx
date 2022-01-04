import React from 'react';
import { Menu } from 'antd';
import Link from 'next/link';
import { connect } from 'react-redux';
import { updateUIValue } from 'src/redux/ui/actions';
import {
  IPerformerCategogies,
  IDataResponse,
  IPerformer,
  IStudio,
  IUser,
  StreamSettings
} from 'src/interfaces';
import './left-header-content.less';
import { SETTING_KEYS } from 'src/constants';
import { useRouter } from 'next/router';

import { useTranslation } from '../../../../i18n';

interface Props {
  loggedIn?: boolean;
  current?: IPerformer & IUser & IStudio;
  performerCategories?: IDataResponse<IPerformerCategogies>;
  settings?: StreamSettings;
  pluralTextModel?: string;
}

const LeftHeaderContent = ({
  loggedIn,
  current,
  pluralTextModel,
  performerCategories,
  settings
}: Props) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const path =
    settings[SETTING_KEYS.OPTION_FOR_GROUP] === 'webrtc' ? 'webrtc/' : '';
  let MenuItem = [
    <Menu.Item key="home">
      <Link href="/" shallow>
        <a>{t('Home')}</a>
      </Link>
    </Menu.Item>,
    <Menu.SubMenu
      title="Categories"
      key="left-menu-performer-categories"
      popupClassName="menu-left-header-submenu-popup"
    >
      {performerCategories.data.length > 0 &&
        performerCategories.data.map((category: IPerformerCategogies) => (
          <Menu.Item key={`category-${category._id}`}>
            <Link
              href={{
                pathname: '/performer-category',
                query: {
                  slug: category.slug,
                  category: JSON.stringify(category)
                }
              }}
              as={`/performer-category/${category.slug}`}
            >
              <a>{category.name}</a>
            </Link>
          </Menu.Item>
        ))}
    </Menu.SubMenu>,
    <Menu.Item key="all-model">
      <Link href="/performer-category" as="/all-models">
        <a>{`All ${pluralTextModel || 'Models'}`}</a>
      </Link>
    </Menu.Item>
  ];

  if (loggedIn && current?._id && current?.role === 'performer') {
    MenuItem = [
      ...MenuItem,
      <Menu.Item disabled={router.route === '/live'} key="left-menu-live-chat">
        <Link href="/live">
          <a>{t('Go Live')}</a>
        </Link>
      </Menu.Item>,
      <Menu.Item
        disabled={router.route === '/live/groupchat'}
        key="left-menu-groupchat"
      >
        <Link href={`/live/${path}groupchat`}>
          <a>{t('Group Chat')}</a>
        </Link>
      </Menu.Item>
    ];
  }

  return (
    <>
      <Menu mode="horizontal" className="menu-left-header">
        {MenuItem}
      </Menu>
    </>
  );
};

LeftHeaderContent.defaultProps = {
  loggedIn: false,
  current: null,
  settings: null,
  pluralTextModel: '',
  performerCategories: {
    total: 0,
    data: []
  }
};
const mapStateToProps = (state) => ({
  loggedIn: state.auth.loggedIn,
  ...state.performer.performers,
  ...state.ui
});
const mapDispatch = { updateUIValue };
export default connect(mapStateToProps, mapDispatch)(LeftHeaderContent);
