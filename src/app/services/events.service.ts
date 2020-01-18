import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { randomInRange } from 'src/app/util';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private lastEndDate: number = 0
  private eventsData = []

  constructor(private data: DataService) { }

  /*
   * Get some randomly generated events in the last month of available data 
   */
  getEventsData() {
    const endDate = this.data.endDate;

    // don't generate new events unless the end-date changed
    if (endDate === this.lastEndDate) return this.eventsData;

    const numEvents = randomInRange(2, 4);
    const eventOffsets = [];

    for (let i = 0; i < numEvents; i++) {
      eventOffsets.push(randomInRange(0, 31));
    }

    this.lastEndDate = endDate;
    this.eventsData = eventOffsets.sort((a, b) => b - a).map((offset, i) => ({
      x: endDate - (offset * 24 * 60 * 60 * 1000),
      title: i+1,
      text: `Description of event #${i+1}`
    }));

    return this.eventsData;
  }
}
