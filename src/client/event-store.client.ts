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
import { PersistentSubscriptionSettings } from '@eventstore/db-client/dist/utils';
import { Inject, Logger } from '@nestjs/common';
import { Guid } from 'guid-typescript';
import {
  EVENT_STORE_CONN_STRING_OPTIONS,
  EVENT_STORE_DNS_CLUSTER_OPTIONS,
  EVENT_STORE_GOSSIP_CLUSTER_OPTIONS,
  EVENT_STORE_SINGLE_NODE_OPTIONS,
} from '../event-store.constants';
import {
  EventStoreConnectionStringOptions,
  EventStoreDnsClusterOptions,
  EventStoreEvent,
  EventStoreGossipClusterOptions,
  EventStoreSingleNodeOptions
} from '../interfaces';

export class EventStoreClient {
  [x: string]: any;
  private logger: Logger = new Logger(this.constructor.name);
  private client: EventStoreDBClient;

  constructor(
    @Inject(EVENT_STORE_CONN_STRING_OPTIONS) connStringOptions: EventStoreConnectionStringOptions,
    @Inject(EVENT_STORE_DNS_CLUSTER_OPTIONS) dnsClusterOptions: EventStoreDnsClusterOptions,
    @Inject(EVENT_STORE_GOSSIP_CLUSTER_OPTIONS) gossipClusterOptions: EventStoreGossipClusterOptions,
    @Inject(EVENT_STORE_SINGLE_NODE_OPTIONS) singleNodeOptions: EventStoreSingleNodeOptions,
  ) {
    try {
      if (connStringOptions) {
        const { connectionString, parts } = connStringOptions;
        this.client = EventStoreDBClient.connectionString(connectionString, ...parts);
      } else if (dnsClusterOptions) {
        const { connectionSettings, channelCredentials, defaultUserCredentials } = dnsClusterOptions;
        this.client = new EventStoreDBClient(connectionSettings, channelCredentials, defaultUserCredentials);
      } else if (gossipClusterOptions) {
        const { connectionSettings, channelCredentials, defaultUserCredentials } = gossipClusterOptions;
        this.client = new EventStoreDBClient(connectionSettings, channelCredentials, defaultUserCredentials);
      } else if (singleNodeOptions) {
        const { connectionSettings, channelCredentials, defaultUserCredentials } = singleNodeOptions;
        this.client = new EventStoreDBClient(connectionSettings, channelCredentials, defaultUserCredentials);
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
