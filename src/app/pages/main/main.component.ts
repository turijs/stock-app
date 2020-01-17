import { Component, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts/highstock';
import { DataService, movingAveragePeriods } from 'src/app/services/data.service';
import { AuthService } from 'src/app/services/auth.service';
import {TICKERS} from 'src/app/services/data.service';
import { FormControl } from '@angular/forms';
import { filter } from 'rxjs/operators';

const groupingUnits = [
  ['week', [1]], 
  ['month', [1, 2, 3, 4, 6]]
];

const numFormatter = new Intl.NumberFormat('en-US', {maximumFractionDigits: 3});

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {
  nuts: string
  chart: Highcharts.Chart
  chartType = new FormControl('ohlc')
  chartTypes = {ohlc: 'OHLC', candlestick: 'Candlestick'}
  ticker = new FormControl(TICKERS[0])
  tickers = TICKERS
  selectedRange = 0

  Highcharts = Highcharts
  updateChart = false

  options: any = {
    title: { text: 'Loading', margin: 60 },
    yAxis: [
      {
        labels: {
          align: 'right',
          x: -3
        },
        title: { text: this.chartTypes[this.chartType.value] },
        height: '60%',
        lineWidth: 2,
        resize: { enabled: true }
      }, 
      {
        labels: {
          align: 'right',
          x: -3
        },
        title: { text: 'Volume' },
        top: '65%',
        height: '35%',
        offset: 0,
        lineWidth: 2
      }
    ],
    tooltip: {
      split: true
    },
    rangeSelector: {
      selected: 0,
      buttons: [
        { type: 'week', count: 1, text: '1w' }, 
        { type: 'month', count: 1, text: '1m' }, 
        { type: 'month', count: 3, text: '3m' },
        { type: 'month', count: 6, text: '6m' },
        { type: 'ytd', text: 'YTD' },
        { type: 'year', count: 1, text: '1y' },
        { type: 'all', text: 'All' }
      ],
      floating: false
    },
    legend: {
      enabled: true,
      verticalAlign: 'top',
      y: -40
      // floating: true
    },
    // chart: { spacingTop: 100 },
    series: [
      {
        name: '',
        type: this.chartType.value,
        data: [],
        dataGrouping: { units: groupingUnits },
        tooltip: {
          pointFormatter: function() {
            return `<span style="color:${this.color}">● </span> <b>${this.series.name}</b><br>`
                 + 'Open: ' + this.open + '<br>'
                 + 'High: ' + this.high + '<br>'
                 + 'Mid: ' + numFormatter.format((this.high + this.low)/2) + '<br>'
                 + 'Low: ' + this.low + '<br>'
                 + 'Close: ' + this.close + '<br>';
          }
        } 
      }, 
      {
        name: 'Vol',
        type: 'column',
        data: [],
        yAxis: 1,
        dataGrouping: { units: groupingUnits }
      }
    ]
  } /* as Highcharts.Options */



  constructor(private data: DataService, auth: AuthService) {    
    this.saveChartInstance = this.saveChartInstance.bind(this);
    const updateOptions = this.updateOptions.bind(this);
    this.updateOptions(false);

    this.chartType.valueChanges.subscribe(updateOptions);
    this.ticker.valueChanges.subscribe(updateOptions);
    this.data.loadingChanges.pipe(filter(l => !l)).subscribe(updateOptions);
  }

  updateOptions(ignoreRange = true) {    
    const tickerData = this.data.getTicker(this.ticker.value);    

    // don't mess with this after initial render
    if (ignoreRange)
      delete this.options.rangeSelector.selected;

    this.options.title.text = tickerData.name;

    this.options.series[0].name = this.ticker.value;
    this.options.series[0].data = tickerData.ohlc;
    this.options.series[0].type = this.chartType.value;

    this.options.series[1].data = tickerData.volume;

    // create moving average series dynamically
    this.options.series.splice(2); // remove existing dynamic series first
    for (let period of movingAveragePeriods) {
      this.options.series.push({
        name: `${period}d MA`,
        data: tickerData.moving[period]
      });
    }

    console.log(this.options);
    

    this.updateChart = true;
  }

  saveChartInstance(chart: Highcharts.Chart) {
    // eval('window.chart = chart');
  }

  ngOnInit() {
  }

}
