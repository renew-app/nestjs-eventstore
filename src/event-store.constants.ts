export const EVENT_STORE_CONN_STRING_OPTIONS = 'EventStoreConnectionStringOptions';
export const EVENT_STORE_DNS_CLUSTER_OPTIONS = 'EventStoreDnsClusterOptions';
export const EVENT_STORE_GOSSIP_CLUSTER_OPTIONS = 'EventStoreGossipClusterOptions';
export const EVENT_STORE_SINGLE_NODE_OPTIONS = 'EventStoreSingleNodeOptions';
export const EVENT_STORE_CLIENT = 'EventStoreClient';

export enum EventStoreSubscriptionType {
  Persistent,
  CatchUp,
}
