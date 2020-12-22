import { DynamicModule, Global, Module } from '@nestjs/common';

import { EVENT_STORE_OPTIONS } from './event-store.constants';
import { EventStoreClient } from './client';
import { EventStoreOptions } from './interfaces';

@Global()
@Module({
  imports: [EventStoreClient],
  exports: [EventStoreClient],
})
export class EventStoreModule {
  static forRoot(options: EventStoreOptions): DynamicModule {
    const configProvider = {
      provide: EVENT_STORE_OPTIONS,
      useValue: {
        ...options,
      },
    };

    const clientProvider = {
      provide: EventStoreClient,
      useClass: EventStoreClient,
    };

    return {
      module: EventStoreModule,
      providers: [configProvider, clientProvider],
      exports: [configProvider, clientProvider],
    };
  }
}
