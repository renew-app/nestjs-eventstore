import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  EVENT_STORE_CONN_STRING_OPTIONS,
  EVENT_STORE_DNS_CLUSTER_OPTIONS,
  EVENT_STORE_GOSSIP_CLUSTER_OPTIONS,
  EVENT_STORE_SINGLE_NODE_OPTIONS,
} from './event-store.constants';
import {
  EventStoreConnectionStringOptions,
  EventStoreDnsClusterOptions,
  EventStoreGossipClusterOptions,
  EventStoreSingleNodeOptions,
} from './interfaces';

import { EventStoreClient } from './client';

@Global()
@Module({
  imports: [EventStoreClient],
  exports: [EventStoreClient],
})
export class EventStoreModule {
  static forRoot(
    connStringOptions?: EventStoreConnectionStringOptions,
    dnsClusterOptions?: EventStoreDnsClusterOptions,
    gossipClusterOptions?: EventStoreGossipClusterOptions,
    singleNodeOptions?: EventStoreSingleNodeOptions,
  ): DynamicModule {
    const connectionProviders = [
      {
        provide: EVENT_STORE_CONN_STRING_OPTIONS,
        useValue: {
          ...connStringOptions,
        },
      },
      {
        provide: EVENT_STORE_DNS_CLUSTER_OPTIONS,
        useValue: {
          ...dnsClusterOptions,
        },
      },
      {
        provide: EVENT_STORE_GOSSIP_CLUSTER_OPTIONS,
        useValue: {
          ...gossipClusterOptions,
        },
      },
      {
        provide: EVENT_STORE_SINGLE_NODE_OPTIONS,
        useValue: {
          ...singleNodeOptions,
        },
      },
    ];

    const clientProvider = {
      provide: EventStoreClient,
      useClass: EventStoreClient,
    };

    return {
      module: EventStoreModule,
      providers: [...connectionProviders, clientProvider],
      exports: [...connectionProviders, clientProvider],
    };
  }
}
