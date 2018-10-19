import _ from 'lodash';
import compareDesc from 'date-fns/compare_desc';
import debug from 'debug';

import { getMediumFeed } from './medium';
import { getLybsynFeed } from './lybsyn';

const log = debug('fcc:rss:news-feed');

const fiveMinutes = 1000 * 60 * 5;

class NewsFeed {
  constructor() {

    this.state = {
      readyState: false,
      mediumFeed: [],
      lybsynFeed: [],
      combinedFeed: []
    };
    this.refreshFeeds();

    setInterval(this.refreshFeeds, fiveMinutes);
  }

  setState = stateUpdater => {
    const newState = stateUpdater(this.state);
    this.state = _.merge({}, this.state, newState);
    return;
  }

  refreshFeeds = () => {
    const currentFeed = this.state.combinedFeed.slice(0);
    log('grabbing feeds');
    return Promise.all([
    getMediumFeed(),
    getLybsynFeed()
  ]).then(
    ([mediumFeed, lybsynFeed]) => this.setState(
      state => ({
        ...state,
        mediumFeed,
        lybsynFeed
      })
    ))
    .then(() => {
      log('crossing the streams');
      const { mediumFeed, lybsynFeed} = this.state;
      const combinedFeed = [ ...mediumFeed, ...lybsynFeed ].sort((a, b) => {
        return compareDesc(a.isoDate, b.isoDate);
      });
      this.setState(state => ({
        ...state,
        combinedFeed,
        readyState: true
      }));
    })
    .catch(err => {
      console.log(err);
      this.setState(state => ({
        ...state,
        combinedFeed: currentFeed
      }));
    });
  }


    getFeed = () => new Promise((resolve) => {
      let notReadyCount = 0;

      function waitForReady() {
        log('notReadyCount', notReadyCount);
        notReadyCount++;
        return this.state.readyState || notReadyCount === 5 ?
          resolve(this.state.combinedFeed) :
          setTimeout(waitForReady, 100);
      }
      log('are we ready to rumble?', this.state.readyState);
      return this.state.readyState ?
        resolve(this.state.combinedFeed) :
        setTimeout(waitForReady, 100);
    })

}

export default NewsFeed;
