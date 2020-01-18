import { Component, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts/highstock';
import { DataService, MOVING_AVERAGE_PERIODS } from 'src/app/services/data.service';
import {TICKERS} from 'src/app/services/data.service';
import { FormControl } from '@angular/forms';
import { EventsService } from 'src/app/services/events.service';
import { round } from 'src/app/util';
import { exec } from 'child_process';

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
    xAxis: {
      dateTimeLabelFormats: {
        millisecond: '%H:%M:%S.%L',
        second: '%H:%M:%S',
        minute: '%H:%M',
        hour: '%H:%M',
        day: '%m/%d/%y',
        week: '%m/%d/%y',
        month: '%m/%y',
        year: '\'%y'
      },
      maxPadding: 1
    },
    yAxis: [
      {
        labels: {
          align: 'right',
          x: -3
        },
        title: { text: this.chartTypes[this.chartType.value] },
        height: '60%',
        lineWidth: 2,
        offset: 120
      }, 
      {
        labels: {
          align: 'right',
          x: -3
        },
        title: { text: 'Volume' },
        top: '65%',
        height: '35%',
        offset: 120,
        lineWidth: 2
      }
    ],
    tooltip: {
      split: true,
      headerFormat: '',
      // xDateFormat: '%Y-%m-%d', // this doesn't correctly control the date format when zoomed out to a year
      positioner: function(boxWidth, boxHeight, point) {
        let yOffset = 0;
        if (point.series.name === 'Vol') {
          yOffset = 220;          
        }

        return {x: point.plotX + 20, y: point.plotY + yOffset};         
      }
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
      inputDateFormat: '%m/%d/%y',
      inputEditDateFormat: '%m/%d/%y'
    },
    legend: {
      enabled: true,
      verticalAlign: 'top',
      y: -40
    },
    series: [
      {
        name: '',
        type: this.chartType.value,
        data: [],
        tooltip: {
          pointFormatter: function() {
            return `<span style="color:${this.color}">● </span> <b>${this.series.name}</b> `
                 + `(${Highcharts.dateFormat('%m/%d/%y', this.x)})` + '<br>'
                 + 'Open: ' + this.open + '<br>'
                 + 'High: ' + this.high + '<br>'
                 + 'Mid: ' + round((this.high + this.low) / 2) + '<br>'
                 + 'Low: ' + this.low + '<br>'
                 + 'Close: ' + this.close + '<br>';
          }
        },
        id: 'ohlcseries'
      }, 
      {
        name: 'Vol',
        type: 'column',
        data: [],
        yAxis: 1,
      },
      {
        name: 'Events',
        type: 'flags',
        data: [],
        onSeries: 'ohlcseries',
        shape: 'circlepin',
        width: 16
      }
    ]
  }



  constructor(private data: DataService, private events: EventsService) { 
    this.saveChartInstance = this.saveChartInstance.bind(this);   
    const updateOptions = this.updateOptions.bind(this);
    updateOptions(false);

    // trigger chart updates from user selections, or when new data becomes available
    this.chartType.valueChanges.subscribe(updateOptions);
    this.ticker.valueChanges.subscribe(updateOptions);
    this.data.loadedEvents.subscribe(updateOptions);
  }

  updateOptions(ignoreRange = true) {    
    const tickerData = this.data.getTicker(this.ticker.value),
          o = this.options;   

    // don't mess with this after initial render
    if (ignoreRange) delete o.rangeSelector.selected;

    o.title.text = tickerData.name;

    o.series[0].name = this.ticker.value;
    o.series[0].type = this.chartType.value;
    o.series[0].data = tickerData.ohlc;

    o.series[1].data = tickerData.volume;

    o.series[2].data = this.events.getEventsData();

    // create moving average series dynamically
    o.series.splice(3); // remove existing dynamic series first
    for (let period of MOVING_AVERAGE_PERIODS) {
      o.series.push({
        name: `${period}d MA`,
        data: tickerData.moving[period]
      });
    }    

    this.updateChart = true;

    if (this.chart) {
      if (tickerData.loading) {
        this.chart.showLoading();
      } else {
        this.chart.hideLoading();
      }
    }
  }

  saveChartInstance(chart) {
    this.chart = chart;
    chart.showLoading();
    eval('window.chart = chart');
  }

  ngOnInit() {}
}
