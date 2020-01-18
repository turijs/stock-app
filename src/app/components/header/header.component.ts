import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import {dateFormat} from 'highcharts/highstock';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  constructor(public auth: AuthService, public data: DataService) { }

  getLastUpdated() {
    const date = this.data.endDate;

    return date > 0 ? dateFormat('%m/%d/%y', date) : '';
  }
}
