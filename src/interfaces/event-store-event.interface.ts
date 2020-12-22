import { JSONEventData } from '@eventstore/db-client';

export interface EventStoreEvent {
  contentType: JSONEventData['contentType'];
  eventType: string;
  payload: any;
  metadata?: any;
}
