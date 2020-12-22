import {
  ErrorType,
  PersistentSubscriptionSettings,
  persistentSubscriptionSettingsFromDefaults,
} from '@eventstore/db-client/dist/utils';
import {
  EventStoreCatchupSubscription as EsCatchUpSubscription,
  EventStorePersistentSubscription as EsPersistentSubscription,
  ExtendedCatchUpSubscription,
  ExtendedPersistentSubscription,
} from './types';
import { EventStoreBusConfig, IEventConstructors } from '.';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { PersistentAction, ResolvedEvent } from '@eventstore/db-client';

import { EventStoreClient } from './client';
import { EventStoreSubscriptionType } from './event-store.constants';
import { IEvent } from '@nestjs/cqrs';
import { Subject } from 'rxjs';

export class EventStoreBus implements OnModuleDestroy {
  private eventHandlers: IEventConstructors = {};
  private logger = new Logger(this.constructor.name);

  private catchupSubscriptions: ExtendedCatchUpSubscription[] = [];
  private catchupSubscriptionCount: number = 0;

  private persistentSubscriptions: ExtendedPersistentSubscription[] = [];
  private persistentSubscriptionsCount: number = 0;

  constructor(
    private readonly client: EventStoreClient,
    private readonly subject$: Subject<IEvent>,
    private readonly config: EventStoreBusConfig,
  ) {
    this.addEventHandlers(this.config.events);

    const catchupSubscriptions =
      this.config.subscriptions?.filter((s) => {
        return s.type === EventStoreSubscriptionType.CatchUp;
      }) || [];

    this.subscribeToCatchUpSubscriptions(catchupSubscriptions as EsCatchUpSubscription[]);

    const persistentSubscriptions =
      this.config.subscriptions?.filter((s) => {
        return s.type === EventStoreSubscriptionType.Persistent;
      }) || [];

    this.subscribeToPersistentSubscriptions(persistentSubscriptions as EsPersistentSubscription[]);
  }

  async subscribeToPersistentSubscriptions(subscriptions: EsPersistentSubscription[]) {
    this.persistentSubscriptionsCount = subscriptions.length;

    await this.createMissingPersistentSubscriptions(subscriptions);

    this.persistentSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        return await this.subscribeToPersistentSubscription(sub.stream, sub.persistentSubscriptionName);
      }),
    );
  }

  async createMissingPersistentSubscriptions(subscriptions: EsPersistentSubscription[]) {
    const settings: PersistentSubscriptionSettings = persistentSubscriptionSettingsFromDefaults({
      resolveLinks: true,
    });

    try {
      await Promise.all(
        subscriptions.map(async (sub) => {
          return this.client
            .createPersistentSubscription(sub.stream, sub.persistentSubscriptionName, settings)
            .then(() => {
              this.logger.verbose(`Created persistent subscription - ${sub.persistentSubscriptionName}:${sub.stream}`);
            })
            .catch((reason) => {
              if (reason.type === ErrorType.PERSISTENT_SUBSCRIPTION_EXISTS) {
                this.logger.verbose(
                  `Persistent Subscription - ${sub.persistentSubscriptionName}:${sub.stream} already exists. Skipping creation.`,
                );
              } else {
                this.logger.error(reason);
              }
            });
        }),
      );
    } catch (e) {
      this.logger.error(e);
    }
  }

  async subscribeToCatchUpSubscriptions(subscriptions: EsCatchUpSubscription[]) {
    this.catchupSubscriptionCount = subscriptions.length;
    this.catchupSubscriptions = await Promise.all(
      subscriptions.map((sub) => {
        return this.subscribeToCatchUpSubscription(sub.stream);
      }),
    );
  }

  get allCatchupSubsriptionsLive(): boolean {
    const initialized = this.catchupSubscriptions.length === this.catchupSubscriptionCount;

    return (
      initialized &&
      this.catchupSubscriptions.every((sub) => {
        return !!sub && sub.isLive;
      })
    );
  }

  get allPersistentSubscriptionsLive(): boolean {
    const initialized = this.persistentSubscriptions.length === this.persistentSubscriptionsCount;

    return (
      initialized &&
      this.persistentSubscriptions.every((sub) => {
        return !!sub && sub.isLive;
      })
    );
  }

  get isLive(): boolean {
    return this.allCatchupSubsriptionsLive && this.allPersistentSubscriptionsLive;
  }

  async publish(event: IEvent, stream?: string) {
    try {
      this.client.writeEventToStream(stream || '$svc-catch-all', event.constructor.name, event);
    } catch (e) {
      this.logger.error(e);
      throw new Error(e);
    }
  }

  async publishAll(events: IEvent[], stream?: string) {
    try {
      this.client.writeEventsToStream(
        stream || '$svc.catch-all',
        events.map((ev) => {
          return {
            contentType: 'application/json',
            eventType: event?.constructor.name || '',
            payload: event,
          };
        }),
      );
    } catch (e) {
      this.logger.error(e);
      throw new Error(e);
    }
  }

  async subscribeToCatchUpSubscription(stream: string): Promise<ExtendedCatchUpSubscription> {
    try {
      const resolved = (await this.client.subscribeToCatchupSubscription(stream)) as ExtendedCatchUpSubscription;

      resolved.on('end', () => {
        this.logger.verbose(`Stream ${stream} completed catch-up processing`);
      });

      resolved.on('error', (err) => {
        this.logger.error(`[${stream}] ${err.message} ${err.stack}`);
      });

      resolved.on('event', (ev) => this.onEvent(ev));

      this.logger.verbose(`Catching up and subscribing to stream ${stream}`);
      resolved.isLive = true;

      return resolved;
    } catch (e) {
      this.logger.error(`[${stream}] ${e.message} ${e.stack}`);
      throw new Error(e);
    }
  }

  async subscribeToPersistentSubscription(
    stream: string,
    subscriptionName: string,
  ): Promise<ExtendedPersistentSubscription> {
    try {
      const resolved = (await this.client.subscribeToPersistentSubscription(
        stream,
        subscriptionName,
      )) as ExtendedPersistentSubscription;

      resolved.on('close', () => {
        this.logger.verbose(
          `Connection to persistent subscription ${subscriptionName} on stream ${stream} closed, attempting to reconnect.`,
        );
        this.onDropped(resolved);
        if (resolved.isPaused) {
          resolved.resume();
        }
      });

      resolved.on('error', (err) => {
        this.logger.error(`[${stream}][${subscriptionName}] ${err.message} ${err.stack}`);
      });

      resolved.on('event', async (ev) => {
        try {
          await this.onEvent(ev);
          resolved.ack(ev?.event?.id || '');
        } catch (e) {
          resolved.nack('park', e, ev?.event?.id || '');
        }
      });

      this.logger.verbose(`Connection to persistent subscription ${subscriptionName} on stream ${stream} established.`);
      resolved.isLive = true;

      return resolved;
    } catch (e) {
      this.logger.error(`[${stream}][${subscriptionName}] ${e.message} ${e.stack}`);
      throw new Error(e);
    }
  }

  async onEvent(payload: ResolvedEvent) {
    const { event } = payload;

    if (!event || !event.isJson) {
      this.logger.error(`Received event that could not be resolved: ${event?.id}:${event?.streamId}`);
      return;
    }

    const { eventType, id, streamId, data } = event;

    const handler = this.eventHandlers[eventType];

    if (!handler) {
      this.logger.warn(`Received event that could not be handled: ${eventType}:${id}:${streamId}`);
      return;
    }

    const rawData = JSON.parse(JSON.stringify(data));
    const parsedData = Object.values(rawData);

    if (this.eventHandlers && this.eventHandlers[eventType || rawData.content.eventType]) {
      this.subject$.next(this.eventHandlers[eventType || rawData.content.eventType](...parsedData));
    } else {
      this.logger.warn(`Event of type ${eventType} not able to be handled.`);
    }
  }

  onDropped(sub: ExtendedCatchUpSubscription | ExtendedPersistentSubscription) {
    sub.isLive = false;
  }

  reSubscribeToPersistentSubscription(stream: string, subscriptionName: string) {
    this.logger.warn(`Reconnecting to subscription ${subscriptionName} ${stream}...`);
    setTimeout((st, subName) => this.subscribeToPersistentSubscription(st, subName), 3000, stream, subscriptionName);
  }

  addEventHandlers(eventHandlers: IEventConstructors) {
    this.eventHandlers = {
      ...this.eventHandlers,
      ...eventHandlers,
    };
  }

  onModuleDestroy() {
    this.persistentSubscriptions?.forEach((sub) => {
      if (!!sub?.isLive) {
        sub.unsubscribe();
      }
    });
  }
}
