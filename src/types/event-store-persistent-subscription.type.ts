import { EventStoreSubscriptionType } from '../event-store.constants';
import { PersistentSubscription } from '@eventstore/db-client';

export type EventStorePersistentSubscription = {
  type: EventStoreSubscriptionType.Persistent;
  stream: string;
  persistentSubscriptionName: string;
};

export interface ExtendedPersistentSubscription extends PersistentSubscription {
  isLive?: boolean;
  isCreated?: boolean;
  stream: string;
  subscription: string;
}
