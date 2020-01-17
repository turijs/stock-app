import { Injectable } from '@angular/core';
import { AuthService, LoginEventTypes } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';

export const TICKERS = [ 'AAPL', 'IBM', /* 'CITI', */ 'AXP', 'CVS', 'GE', 'MSFT' ];
const API_BASE = 'https://www.quandl.com/api/v3/datasets/WIKI';
export const movingAveragePeriods = [10, 25, 100, 200];

// create an empty dictionary of moving averages
function movingFactory() {
  return movingAveragePeriods.reduce((obj, period) => { 
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
  }
}

const defaultTickerData: TickerData = {
  name: 'Loading...',
  ohlc: [],
  volume: [],
  moving: movingFactory()
}

// create 1 weeks's worth of fake default data
for (let t = Date.UTC(2018, 2, 27), i = 0; i < 1000; i++, t -= 1000 * 60 * 60 * 24) {
  defaultTickerData.ohlc.unshift([t, 100, 150, 50, 100]);
  defaultTickerData.volume.unshift([t, 100, 150, 50, 100]);
}


@Injectable({
  providedIn: 'root'
})
export class DataService {
  byTicker: {[key: string]: TickerData} = {}
  loadingChanges = new Subject<boolean>()

  constructor(private auth: AuthService, private http: HttpClient) {
    const savedData = JSON.parse(window.localStorage.getItem('data'));
    if (savedData) {
      this.byTicker = savedData;
    } else if (auth.isLoggedIn) {
      // if the user logged in but no saved data exists, load it now
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

  getTicker(ticker) {
    return this.byTicker[ticker] || defaultTickerData;
  }

  async loadInitialData() {
    let apiKey = this.auth.apiKey;
    this.loadingChanges.next(true);

    for (let ticker of TICKERS) {
      const res: any = await this.http.get(`${API_BASE}/${ticker}.json?api_key=${apiKey}&order=asc`).toPromise();

      const name = res.dataset.name, ohlc = [], volume = [];
      res.dataset.data.forEach(entry => {
        // convert to Unix date
        const [year, month, day] = entry[0].split('-').map((n: string) => parseInt(n, 10));
        entry[0] = Date.UTC(year, month - 1, day);

        ohlc.push(entry.slice(0, 5));
        volume.push([entry[0], entry[5]]);
      })

      this.byTicker[ticker] = {name, ohlc, volume, moving: movingFactory()};
      this.calcMovingAverages(ticker);
    }

    this.loadingChanges.next(false);
    this.persist();
  }

  calcMovingAverages(ticker) {
    const {ohlc} = this.byTicker[ticker];

    let movingSums = {};
    for (let period of movingAveragePeriods) {
      movingSums[period] = 0;
    }

    for (let i = 0; i < ohlc.length; i++) {
      for (let period of movingAveragePeriods) {
        movingSums[period] += ohlc[i][4]; // index 4 is closing price

        if (i >= period) movingSums[period] -= ohlc[i - period][4]; // ensure only last <period> points are included in sum

        if (i >= period - 1) {
          this.byTicker[ticker].moving[period].push([
            ohlc[i][0], // date
            Math.round(movingSums[period] / period * 1000) / 1000
          ]);
        }
      }
    }
  }

  private clearData() {
    this.byTicker = {};
    window.localStorage.removeItem('data');
  }

  private persist() {
    window.localStorage.setItem('data', JSON.stringify(this.byTicker));
  }
}
