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
import { EVENT_STORE_OPTIONS } from '../event-store.constants';
import { EventStoreEvent, EventStoreOptions } from '../interfaces';

export class EventStoreClient {
  [x: string]: any;
  private logger: Logger = new Logger(this.constructor.name);
  private client: EventStoreDBClient;

  constructor(@Inject(EVENT_STORE_OPTIONS) options: EventStoreOptions) {
    try {
      const {
        connectionSettings,
        insecure,
        certChain,
        rootCertificate,
        verifyOptions,
        defaultUserCredentials,
      } = options;

      this.client = new EventStoreDBClient(
        connectionSettings,
        {
          insecure,
          certChain,
          rootCertificate,
          verifyOptions,
        },
        defaultUserCredentials,
      );
    } catch (e) {
      this.logger.error(e);
      throw new Error(e);
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
