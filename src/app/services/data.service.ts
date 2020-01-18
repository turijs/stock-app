import { Injectable } from '@angular/core';
import { AuthService, LoginEventTypes } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { round, randomInRange, randomFloatInRange } from 'src/app/util';


export const TICKERS = [ 'AAPL', 'IBM', /* 'CITI', */ 'AXP', 'CVS', 'GE', 'MSFT' ];
const API_BASE = 'https://www.quandl.com/api/v3/datasets/WIKI';
export const MOVING_AVERAGE_PERIODS = [10, 25, 100, 200];

// create an empty dictionary of moving averages
function movingFactory() {
  return MOVING_AVERAGE_PERIODS.reduce((obj, period) => { 
    obj[period] = []; 
    return obj; 
  }, {});
}

interface TickerData {
  name: string,
  ohlc: number[][],
  volume: number[][]
  moving: {
    [key: number]: number[][]
  },
  loading?: boolean
}

const defaultTickerData: TickerData = {
  name: 'Loading...',
  ohlc: [],
  volume: [],
  moving: movingFactory(),
  loading: true,
}

// create 1 weeks's worth of fake default data
// without this, the chart does not update properly when the real data becomes available
for (let t = Date.UTC(2018, 2, 27), i = 0; i < 1000; i++, t -= 1000 * 60 * 60 * 24) {
  defaultTickerData.ohlc.unshift([t, 100, 150, 50, 100]);
  defaultTickerData.volume.unshift([t, 100, 150, 50, 100]);
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private byTicker: {[key: string]: TickerData} = {}
  loadedEvents = new Subject<string>()
  progress = 0 // loading progress
  endDate = 0

  get isLoading() { return this.progress < 100; }

  constructor(private auth: AuthService, private http: HttpClient) {
    if (auth.isLoggedIn) {
      this.loadInitialData();
    }

    auth.loginEvents.subscribe(event => {
      if (event === LoginEventTypes.Login) {
        this.loadInitialData();
      } else {
        this.clearData();
      }
    });
  }

  getTicker(ticker: string) {
    return this.byTicker[ticker] || defaultTickerData;
  }

  /*
   * Load initial data from the Quandl API
   * Only send two requests in parallel to stay within API limits 
   */
  loadInitialData() {
    let apiKey = this.auth.apiKey;
    let tickerIndex = 0, tickersCompleted = 0;
    this.updateProgress(0);

    const processResponse = (ticker: string, res: any) => {
      if (tickerIndex < TICKERS.length) processNext();
      
      this.byTicker[ticker] = this.processRawData(res);
      this.updateProgress(++tickersCompleted, ticker);
    }

    const processNext = () => {
      let ticker = TICKERS[tickerIndex++];
      this.http.get(`${API_BASE}/${ticker}.json?api_key=${apiKey}&order=asc`)
        .subscribe(processResponse.bind({}, ticker), () => console.error(`Error retrieving data for ${ticker}`));
    }

    // start two requests in parallel
    processNext();
    processNext();
  }

  /*
   * Extract relevant information from Quandl API response, convert date strings to timestamps
   */
  processRawData(responseData: any) {
    const name = responseData.dataset.name, ohlc = [], volume = [];

    responseData.dataset.data.forEach(point => {
      // convert to Unix timestamp
      const [year, month, day] = point[0].split('-').map((n: string) => parseInt(n, 10));
      point[0] = Date.UTC(year, month - 1, day);

      ohlc.push(point.slice(0, 5));
      volume.push([point[0], point[5]]);
    });

    return {name, ohlc, volume, moving: this.calcMovingAverages(ohlc)};
  }

  calcMovingAverages(ohlc) {
    let movingAverageData = movingFactory();
    let movingSums = {};
    for (let period of MOVING_AVERAGE_PERIODS) {
      movingSums[period] = 0;
    }

    for (let i = 0; i < ohlc.length; i++) {
      for (let period of MOVING_AVERAGE_PERIODS) {
        movingSums[period] += ohlc[i][4]; // index 4 is closing price

        if (i >= period) movingSums[period] -= ohlc[i - period][4]; // ensure only last <period> points are included in sum

        if (i >= period - 1) {
          movingAverageData[period].push([
            ohlc[i][0], // timestamp
            round(movingSums[period] / period)
          ]);
        }
      }
    }

    return movingAverageData;
  }

  calcEndDate() {
    let endDate = 0;
    for (let ticker of TICKERS) {
      const {ohlc} = this.getTicker(ticker);
      endDate = Math.max(endDate, ohlc[ohlc.length - 1][0])
    }
    this.endDate = endDate;
  }

  updateDataFake() {
    if (this.isLoading) return;

    let tickerIndex = 0, tickersLoaded = 0;
    this.updateProgress(0);

    // simulate network delay with timeouts
    const updateNext = () => {
      const ticker = TICKERS[tickerIndex];
      const tickerData = this.byTicker[ticker];

      this.appendFakeData(tickerData);
      this.updateProgress(++tickersLoaded, ticker);

      if (++tickerIndex < TICKERS.length) {
        setTimeout(updateNext, randomInRange(300, 1500));
      }
    }

    setTimeout(updateNext, 500);
  }

  /*
   * Append fake data up to yesterday for the supplied tickerData 
   */
  private appendFakeData(data: TickerData) {
    const {ohlc, volume} = data;
      const oneDay = 24 * 60 * 60 * 1000;

      for (let i = ohlc.length - 1;; i++) {
        let newTime = ohlc[i][0] + oneDay;

        // don't go past yesterday
        if (newTime > Date.now() - oneDay) break;

        ohlc.push([newTime, ...this.newOhlc(ohlc[i].slice(1))]);
        volume.push([newTime, this.newVolume(volume[i][1])]);
      }

      data.moving = this.calcMovingAverages(ohlc);
  }

  /*
   * Generate new OHLC data using random offsets from existing 
   */
  private newOhlc(oldOhlc: number[]) {
    const [open, high, low, close] = oldOhlc;

    let newHigh = randomFloatInRange(high - 9.5, high + 10);
    let newLow = randomFloatInRange(newHigh - 8, newHigh - 2);
    let newOpen = randomFloatInRange(newLow, newHigh);
    let newClose = randomFloatInRange(newLow, newHigh);

    return [newOpen, newHigh, newLow, newClose].map(val => round(val));
  }

  private newVolume(oldVolume: number) {
    return round(randomFloatInRange(oldVolume * .80, oldVolume * 1.25));
  }

  /*
   * Progress is out of 100
   */
  private updateProgress(totalTickersLoaded: number, currentTicker = '') {
    this.progress = Math.round(100 * totalTickersLoaded / TICKERS.length);

    // if we've finished loading, new end data needs to be calculated
    if (this.progress === 100) this.calcEndDate();

    if (currentTicker) this.loadedEvents.next(currentTicker);
  }

  private clearData() {
    this.byTicker = {};
  }
}
