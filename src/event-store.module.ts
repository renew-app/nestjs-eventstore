import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  EventStoreConnectionStringOptions,
  EventStoreDnsClusterOptions,
  EventStoreGossipClusterOptions,
  EventStoreSingleNodeOptions,
} from './interfaces';

import { EVENT_STORE_CONNECTION_OPTIONS } from './event-store.constants';
import { EventStoreClient } from './client';

@Global()
@Module({
  imports: [EventStoreClient],
  exports: [EventStoreClient],
})
export class EventStoreModule {
  static forRoot(
    options: EventStoreConnectionStringOptions | EventStoreDnsClusterOptions | EventStoreGossipClusterOptions | EventStoreSingleNodeOptions,
  ): DynamicModule {
    const connectionProviders = [
      {
        provide: EVENT_STORE_CONNECTION_OPTIONS,
        useValue: {
          ...options,
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
