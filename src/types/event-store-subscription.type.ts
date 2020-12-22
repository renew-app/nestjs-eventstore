import { EventStoreCatchupSubscription } from './event-store-catchup-subscription.type';
import { EventStorePersistentSubscription } from './event-store-persistent-subscription.type';

export type EventStoreSubscription = EventStorePersistentSubscription | EventStoreCatchupSubscription;
