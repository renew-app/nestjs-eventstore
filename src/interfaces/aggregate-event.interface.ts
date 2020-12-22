import { IEvent } from '@nestjs/cqrs';

export interface AggregateEvent extends IEvent {
  streamName: string;
}
