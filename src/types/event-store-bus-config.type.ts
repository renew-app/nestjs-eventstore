import { EventStoreSubscription } from './event-store-subscription.type';
import { IEventConstructors } from '../interfaces';

export type EventStoreBusConfig = {
  subscriptions: EventStoreSubscription[];
  events: IEventConstructors;
};
