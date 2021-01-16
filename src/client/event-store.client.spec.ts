import {
  Credentials,
  DnsClusterOptions,
  Endpoint,
  EventStoreConnectionStringOptions,
  EventStoreDnsClusterOptions,
  EventStoreGossipClusterOptions,
  EventStoreSingleNodeOptions,
  GossipClusterOptions,
  SingleNodeOptions,
} from '../interfaces';

import { EventStoreClient } from './event-store.client';

test('instantiate eventstoreclient with insecure connection string', () => {
  const esClient = new EventStoreClient({
    connectionString: 'esdb://eventstore:2113?tls=false',
  } as EventStoreConnectionStringOptions);
  expect(esClient).toBeDefined();
});

test('instantiate eventstoreclient with secure connection string and credentials', () => {
  const esClient = new EventStoreClient({
    connectionString: 'esdb://admin:changeit@eventstore:2113?tls=true',
  } as EventStoreConnectionStringOptions);
  expect(esClient).toBeDefined();
});

test('instantiate eventstoreclient with non-connection string DNS cluster configuration', () => {
  const esClient = new EventStoreClient({
    connectionSettings: {
      discover: {
        address: 'eventstore',
        port: 2113,
      } as Endpoint,
      nodePreference: 'random',
    } as DnsClusterOptions,
    channelCredentials: {
      certChain: undefined,
      insecure: true,
      privateKey: undefined,
      rootCertificate: undefined,
      verifyOptions: undefined,
    },
    defaultUserCredentials: {
      username: 'admin',
      password: 'changeit',
    } as Credentials,
  } as EventStoreDnsClusterOptions);
  expect(esClient).toBeDefined();
});

test('instantiate eventstoreclient with non-connection string gossip cluster configuration', () => {
  const esClient = new EventStoreClient({
    connectionSettings: {
      endpoints: [
        {
          address: 'eventstore',
          port: 2113,
        },
      ],
      nodePreference: 'random',
    } as GossipClusterOptions,
    channelCredentials: {
      certChain: undefined,
      insecure: true,
      privateKey: undefined,
      rootCertificate: undefined,
      verifyOptions: undefined,
    },
    defaultUserCredentials: {
      username: 'admin',
      password: 'changeit',
    } as Credentials,
  } as EventStoreGossipClusterOptions);
  expect(esClient).toBeDefined();
});

test('instantiate eventstoreclient with non-connection string single node configuration', () => {
  const esClient = new EventStoreClient({
    connectionSettings: {
      endpoint: {
        address: 'eventstore',
        port: 2113,
      },
    } as SingleNodeOptions,
    channelCredentials: {
      certChain: undefined,
      insecure: true,
      privateKey: undefined,
      rootCertificate: undefined,
      verifyOptions: undefined,
    },
    defaultUserCredentials: {
      username: 'admin',
      password: 'changeit',
    } as Credentials,
  } as EventStoreSingleNodeOptions);
  expect(esClient).toBeDefined();
});
