import 'reflect-metadata';

import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { DynamicModule, Global, Logger, Module, OnModuleInit, Provider } from '@nestjs/common';
import { EventStoreBusConfig, EventStoreBusProvider } from '.';
import { EventStoreConnectionStringOptions, IEventConstructors } from './interfaces';

import { EventStoreClient } from './client';
import { EventStoreModule } from './event-store.module';
import { EventStorePublisher } from './event-store.publisher';
import { ExplorerService } from '@nestjs/cqrs/dist/services/explorer.service';
import { ModuleRef } from '@nestjs/core';

@Global()
@Module({})
export class EventStoreCoreModule implements OnModuleInit {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly explorerService: ExplorerService,
    private readonly eventsBus: EventBus,
    private readonly commandsBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  onModuleInit() {
    const { events, queries, sagas, commands } = this.explorerService.explore();
    this.eventsBus.register(events);
    this.commandsBus.register(commands);
    this.queryBus.register(queries);
    this.eventsBus.registerSagas(sagas);
  }

  static forRoot(
    options: EventStoreConnectionStringOptions,
    eventStoreBusConfigs: EventStoreBusConfig[],
  ): DynamicModule {
    const eventBusProvider = this.createEventBusProviders(eventStoreBusConfigs);

    return {
      module: EventStoreCoreModule,
      imports: [EventStoreModule.forRoot(options)],
      providers: [
        CommandBus,
        QueryBus,
        EventStorePublisher,
        ExplorerService,
        eventBusProvider,
        {
          provide: EventStoreBusProvider,
          useExisting: EventBus,
        },
      ],
      exports: [
        EventStoreModule,
        EventStoreBusProvider,
        EventBus,
        CommandBus,
        QueryBus,
        ExplorerService,
        EventStorePublisher,
      ],
    };
  }

  private static createEventBusProviders(configs: EventStoreBusConfig[]): Provider {
    let events: IEventConstructors = {};
    configs.forEach((c) => {
      events = {
        ...events,
        ...c.events,
      };
    });

    const subscriptions = configs
      .map((c) => {
        return c.subscriptions;
      })
      .reduce((a, b) => a.concat(b), []);

    return {
      provide: EventBus,
      useFactory: (commandBus, moduleRef, client) => {
        return new EventStoreBusProvider(commandBus, moduleRef, client, {
          subscriptions,
          events,
        });
      },
      inject: [CommandBus, ModuleRef, EventStoreClient],
    };
  }
}
