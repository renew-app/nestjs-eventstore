import { EventStoreSubscriptionType } from '../event-store.constants';
import { StreamSubscription } from '@eventstore/db-client';

export type EventStoreCatchupSubscription = {
  type: EventStoreSubscriptionType.CatchUp;
  stream: string;
};

export interface ExtendedCatchUpSubscription extends StreamSubscription {
  isLive?: boolean;
}
