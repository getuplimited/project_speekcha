import { PureComponent } from 'react';
import {
  IPerformer,
  ICountries,
  IPerformerCategogies,
  IPerformSearch,
  IUIConfig,
  IStreamingCategories
} from 'src/interfaces';
import PerformerGrid from '@components/performer/performer-grid';
import { connect } from 'react-redux';
import {
  searchPerformer,
  updatePerformerFavourite,
  updateCurrentPerformer
} from '@redux/performer/actions';
import { loginSuccess } from '@redux/auth/actions';
import { updateCurrentUser } from '@redux/user/actions';
import { updateCurrentStudio } from '@redux/studio/actions';
import PerformerFilter from '@components/user/performer-filter';
import { favouriteService } from 'src/services';
import { message } from 'antd';
import { getResponseError } from 'src/lib';
import { withRouter, NextRouter } from 'next/router';
import { SocketContext } from 'src/socket';
import { streamService } from '@services/stream.service';
import Head from 'next/head';

import { withTranslation } from '../i18n';

interface IProps {
  router: NextRouter;
  ui: IUIConfig;
  data: IPerformer[];
  searchPerformer?: Function;
  total?: number;
  success?: boolean;
  error?: any;
  searching?: boolean;
  loggedIn?: boolean;
  query?: {
    q: string;
  };
  categories?: IPerformerCategogies[];
  countries?: ICountries[];
  updatePerformerFavourite: Function;
  updateCurrentUser: Function;
  updateCurrentPerformer: Function;
  updateCurrentStudio: Function;
  loginSuccess: Function;
  t: any;
}

interface IStates {
  query: IPerformSearch;
  sort?: {
    name: string;
    sortBy?: string;
  };
  categoriesStream: IStreamingCategories[];
}

const initQueryState: IPerformSearch = {
  offset: 0,
  limit: 60,
  gender: '',
  category: '',
  country: '',
  sortBy: '',
  sort: 'desc',
  liveCategoryId: ''
};

class Homepage extends PureComponent<IProps, IStates> {
  static layout = 'public';

  static authenticate = false;

  private socket;

  constructor(props: IProps) {
    super(props);
    this.state = {
      query: initQueryState,
      categoriesStream: []
    };
  }

  componentDidMount() {
    this.search();
    this.socket = this.context;
    this.socket.on('modelUpdateStatus', this.search);
    this.socket.on('modelUpdateStreamingStatus', this.search);
    this.getCategoriesStream();
  }

  componentDidUpdate(prevProps: IProps, prevStates: IStates) {
    const { router, loggedIn } = this.props;
    const { query } = this.state;
    if (
      router.query.q !== prevProps.router.query.q ||
      query !== prevStates.query
    ) {
      this.search();
    }
    if (!loggedIn && loggedIn !== prevProps.loggedIn) {
      this.search();
    }
  }

  componentWillUnmount() {
    this.socket = this.context;
    if (this.socket) {
      this.socket.off('modelUpdateStatus');
      this.socket.off('modelUpdateStreamingStatus');
    }
  }

  async onLike(performer: IPerformer) {
    const { updatePerformerFavourite: dispatchUpdatePerformerFavorite } =
      this.props;
    const { _id, isFavorite } = performer;
    try {
      await favouriteService.favorite(_id, isFavorite);
      dispatchUpdatePerformerFavorite(_id);
    } catch (error) {
      const e = await Promise.resolve(error);
      message.error(getResponseError(e));
    }
  }

  setFilter(name: string, value: any) {
    const { query } = this.state;
    this.setState({
      query: {
        ...query,
        [name]: value
      }
    });
  }

  async getCategoriesStream() {
    const rep = await streamService.search();
    this.setState({ categoriesStream: rep.data.data });
  }

  search = () => {
    const { router, searchPerformer: dispatchSearchPerformer } = this.props;
    const { query } = this.state;
    dispatchSearchPerformer({
      ...query,
      ...router.query
    });
  };

  clearFilter() {
    this.setState({
      query: initQueryState
    });
  }

  render() {
    const { categories, countries, ui, t } = this.props;
    const { query, categoriesStream } = this.state;

    return (
      <>
        <Head>
          <title>{ui?.siteName}</title>
        </Head>
        <div className="homepage">
          <PerformerFilter
            categoryStream={categoriesStream}
            countries={countries}
            categories={categories}
            setFilter={this.setFilter.bind(this)}
            clearFilter={this.clearFilter.bind(this)}
            {...query}
          />
          <PerformerGrid
            {...this.props}
            onLike={this.onLike.bind(this)}
            title={t('Live cams')}
            isPage
            setFilter={this.setFilter.bind(this)}
            {...query}
          />
        </div>
      </>
    );
  }
}

Homepage.contextType = SocketContext;

const mapStateToProps = (state) => ({
  ui: { ...state.ui },
  ...state.performer.performers,
  countries: state.settings.countries,
  loggedIn: state.auth.loggedIn,
  categories: state.performer.categories.data
});
const mapDispatch = {
  searchPerformer,
  updatePerformerFavourite,
  updateCurrentUser,
  updateCurrentPerformer,
  updateCurrentStudio,
  loginSuccess
};
export default connect(
  mapStateToProps,
  mapDispatch
)(withTranslation('common')(withRouter(Homepage)));
