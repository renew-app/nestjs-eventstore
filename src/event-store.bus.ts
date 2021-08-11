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

    const createSubscriptionResults = await this.createMissingPersistentSubscriptions(subscriptions);

    const availableSubscriptionsCount = createSubscriptionResults.filter((s) => s.isCreated === true).length;

    if (availableSubscriptionsCount === this.persistentSubscriptionsCount) {
      this.persistentSubscriptions = await Promise.all(
        subscriptions.map(async (sub) => {
          return await this.subscribeToPersistentSubscription(sub.stream, sub.persistentSubscriptionName);
        }),
      );
    } else {
      this.logger.error(
        `Not proceeding with subscribing to persistent subscriptions. Configured subscriptions ${this.persistentSubscriptionsCount} does not equal the created and available subscriptions ${availableSubscriptionsCount}.`,
      );
    }
  }

  async createMissingPersistentSubscriptions(
    subscriptions: EsPersistentSubscription[],
  ): Promise<ExtendedPersistentSubscription[]> {
    const settings: PersistentSubscriptionSettings = persistentSubscriptionSettingsFromDefaults({
      resolveLinkTos: true,
    });

    try {
      const subs = subscriptions.map(async (sub) => {
        this.logger.verbose(
          `Starting to verify and create persistent subscription - [${sub.stream}][${sub.persistentSubscriptionName}]`,
        );

        return this.client
          .createPersistentSubscription(sub.stream, sub.persistentSubscriptionName, settings)
          .then(() => {
            this.logger.verbose(`Created persistent subscription - ${sub.persistentSubscriptionName}:${sub.stream}`);
            return {
              isLive: false,
              isCreated: true,
              stream: sub.stream,
              subscription: sub.persistentSubscriptionName,
            } as ExtendedPersistentSubscription;
          })
          .catch((reason) => {
            if (reason.type === ErrorType.PERSISTENT_SUBSCRIPTION_EXISTS) {
              this.logger.verbose(
                `Persistent Subscription - ${sub.persistentSubscriptionName}:${sub.stream} already exists. Skipping creation.`,
              );

              return {
                isLive: false,
                isCreated: true,
                stream: sub.stream,
                subscription: sub.persistentSubscriptionName,
              } as ExtendedPersistentSubscription;
            } else {
              this.logger.error(`[${sub.stream}][${sub.persistentSubscriptionName}] ${reason.message} ${reason.stack}`);

              return {
                isLive: false,
                isCreated: false,
                stream: sub.stream,
                subscription: sub.persistentSubscriptionName,
              } as ExtendedPersistentSubscription;
            }
          });
      });

      return await Promise.all(subs);
    } catch (e) {
      this.logger.error(e);
      return [];
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
      this.logger.debug({
        message: `Publishing event`,
        event,
        stream,
      });

      this.client.writeEventToStream(stream || '$svc-catch-all', event.constructor.name, event);
    } catch (e) {
      this.logger.error(e);
      throw new Error(e);
    }
  }

  async publishAll(events: IEvent[], stream?: string) {
    try {
      this.logger.debug({
        message: `Publishing events`,
        events,
        stream,
      });

      this.client.writeEventsToStream(
        stream || '$svc.catch-all',
        events.map((event) => {
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

      resolved
        .on('data', (ev: ResolvedEvent) => this.onEvent(ev))
        .on('confirmation', () => this.logger.log(`[${stream}] Catch-Up subscription confirmation`))
        .on('close', () => this.logger.log(`[${stream}] Subscription closed`))
        .on('error', (err: Error) => {
          this.logger.error({ stream, error: err, msg: `Subscription error` });
          this.onDropped(resolved);
        });

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

      for await (const ev of resolved) {
        if (!ev.event) continue;

        try {
          // this.onEvent(ev);
          await resolved.ack(ev.event.id);
          this.logger.debug({ msg: `ack ${ev.event.id}`});
        } catch (err) {
          this.logger.error({
            error: err,
            msg: `Error handling event`,
            event: ev,
            stream,
            subscriptionName,
          });
          // resolved.nack('retry', err, ev.event.id);
        }
      }


      resolved
        // .on('data', (ev: ResolvedEvent) => {
        //   try {
        //     this.onEvent(ev);
        //     await resolved.ack(ev.event?.id || '');
        //   } catch (err) {
        //     this.logger.error({
        //       error: err,
        //       msg: `Error handling event`,
        //       event: ev,
        //       stream,
        //       subscriptionName,
        //     });
        //     resolved.nack('retry', err, ev.event?.id || '');
        //   }
        // })
        .on('confirmation', () =>
          this.logger.log(`[${stream}][${subscriptionName}] Persistent subscription confirmation`),
        )
        .on('close', () => {
          this.logger.log(`[${stream}][${subscriptionName}] Persistent subscription closed`);
          this.onDropped(resolved);
          this.reSubscribeToPersistentSubscription(stream, subscriptionName);
        })
        .on('error', (err: Error) => {
          this.logger.error({ stream, subscriptionName, error: err, msg: `Persistent subscription error` });
          this.onDropped(resolved);
          this.reSubscribeToPersistentSubscription(stream, subscriptionName);
        });

      this.logger.verbose(`Connection to persistent subscription ${subscriptionName} on stream ${stream} established.`);
      resolved.isLive = true;

      return resolved;
    } catch (e) {
      this.logger.error(`[${stream}][${subscriptionName}] ${e.message} ${e.stack}`);
      throw new Error(e);
    }
  }

  onEvent(payload: ResolvedEvent) {
    const { event } = payload;

    if (!event || !event.isJson) {
      this.logger.error(`Received event that could not be resolved: ${event?.id}:${event?.streamId}`);
      return;
    }

    const { type, id, streamId, data } = event;

    const handler = this.eventHandlers[type];

    if (!handler) {
      this.logger.warn(`Received event that could not be handled: ${type}:${id}:${streamId}`);
      return;
    }

    const rawData = JSON.parse(JSON.stringify(data));
    const parsedData = Object.values(rawData);

    if (this.eventHandlers && this.eventHandlers[type || rawData.content.eventType]) {
      this.subject$.next(this.eventHandlers[type || rawData.content.eventType](...parsedData));
    } else {
      this.logger.warn(`Event of type ${type} not able to be handled.`);
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
