import {
  END,
  EventStoreDBClient,
  JSONEventData,
  PersistentSubscription,
  ReadRevision,
  START,
  StreamSubscription,
  WriteResult,
} from '@eventstore/db-client';
import { GossipClusterOptions, SingleNodeOptions } from '@eventstore/db-client/dist/Client';
import { PersistentSubscriptionSettings } from '@eventstore/db-client/dist/utils';
import { Inject, Logger } from '@nestjs/common';
import { Guid } from 'guid-typescript';
import { EVENT_STORE_CONNECTION_OPTIONS } from '../event-store.constants';
import {
  DnsClusterOptions,
  EventStoreConnectionStringOptions,
  EventStoreDnsClusterOptions,
  EventStoreEvent,
  EventStoreGossipClusterOptions,
  EventStoreSingleNodeOptions,
} from '../interfaces';

export class EventStoreClient {
  [x: string]: any;
  private logger: Logger = new Logger(this.constructor.name);
  private client: EventStoreDBClient;

  constructor(
    @Inject(EVENT_STORE_CONNECTION_OPTIONS)
    options:
      | EventStoreConnectionStringOptions
      | EventStoreDnsClusterOptions
      | EventStoreGossipClusterOptions
      | EventStoreSingleNodeOptions,
  ) {
    try {
      if (options) {
        if ((options as EventStoreConnectionStringOptions).connectionString) {
          const { connectionString, parts } = options as EventStoreConnectionStringOptions;
          this.client = EventStoreDBClient.connectionString(connectionString, ...parts);
        } else {
          const { connectionSettings, channelCredentials, defaultUserCredentials } = options as
            | EventStoreDnsClusterOptions
            | EventStoreGossipClusterOptions
            | EventStoreSingleNodeOptions;

          if ((connectionSettings as DnsClusterOptions).discover) {
            this.client = new EventStoreDBClient(
              connectionSettings as DnsClusterOptions,
              channelCredentials,
              defaultUserCredentials,
            );
          } else if ((connectionSettings as GossipClusterOptions).endpoints) {
            this.client = new EventStoreDBClient(
              connectionSettings as GossipClusterOptions,
              channelCredentials,
              defaultUserCredentials,
            );
          } else if ((connectionSettings as SingleNodeOptions).endpoint) {
            this.client = new EventStoreDBClient(
              connectionSettings as SingleNodeOptions,
              channelCredentials,
              defaultUserCredentials,
            );
          } else {
            throw Error('The connectionSettings property appears to be incomplete or malformed.');
          }
        }
      } else {
        throw Error('Connection information not provided.');
      }
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async writeEventToStream(streamName: string, eventType: string, payload: any, metadata?: any): Promise<WriteResult> {
    return this.client.writeEventsToStream(streamName, {
      contentType: 'application/json',
      eventType,
      id: Guid.create().toString(),
      payload,
      metadata,
    } as JSONEventData);
  }

  async writeEventsToStream(streamName: string, events: EventStoreEvent[]): Promise<WriteResult> {
    return this.client.writeEventsToStream(
      streamName,
      events.map((ev) => {
        return {
          ...ev,
          id: Guid.create().toString(),
        } as JSONEventData;
      }),
    );
  }

  async createPersistentSubscription(
    streamName: string,
    persistentSubscriptionName: string,
    settings: PersistentSubscriptionSettings,
  ): Promise<void> {
    return this.client.createPersistentSubscription(streamName, persistentSubscriptionName, settings);
  }

  async subscribeToPersistentSubscription(
    streamName: string,
    persistentSubscriptionName: string,
  ): Promise<PersistentSubscription> {
    return this.client.connectToPersistentSubscription(streamName, persistentSubscriptionName);
  }

  async subscribeToCatchupSubscription(streamName: string, fromRevision?: ReadRevision): Promise<StreamSubscription> {
    return this.client.subscribeToStream(streamName, {
      fromRevision: fromRevision || START,
      resolveLinks: true,
    });
  }

  async subscribeToVolatileSubscription(streamName: string): Promise<StreamSubscription> {
    return this.client.subscribeToStream(streamName, {
      fromRevision: END,
      resolveLinks: true,
    });
  }
}
