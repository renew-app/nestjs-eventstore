import { ChannelCredentials } from '@grpc/grpc-js';

declare const RANDOM = 'random';
declare const FOLLOWER = 'follower';
declare const LEADER = 'leader';
declare type NodePreference = typeof RANDOM | typeof FOLLOWER | typeof LEADER;

export interface Endpoint {
  address: string;
  port: number;
}

export interface ChannelCredentialOptions {
  insecure?: boolean;
  rootCertificate?: Buffer;
  privateKey?: Buffer;
  certChain?: Buffer;
  verifyOptions?: Parameters<typeof ChannelCredentials.createSsl>[3];
}

export interface Credentials {
  username: string;
  password: string;
}

export interface DnsClusterOptions {
  discover: Endpoint;
  nodePreference?: NodePreference;
}

export interface GossipClusterOptions {
  endpoints: Endpoint[];
  nodePreference?: NodePreference;
}

export interface SingleNodeOptions {
  endpoint: Endpoint | string;
}

export interface EventStoreConnectionStringOptions {
  connectionString: TemplateStringsArray | string;
  parts?: string[];
}

export interface EventStoreDnsClusterOptions {
  connectionSettings: DnsClusterOptions;
  channelCredentials?: ChannelCredentialOptions;
  defaultUserCredentials?: Credentials;
}

export interface EventStoreGossipClusterOptions {
  connectionSettings: GossipClusterOptions;
  channelCredentials?: ChannelCredentialOptions;
  defaultUserCredentials?: Credentials;
}

export interface EventStoreSingleNodeOptions {
  connectionSettings: SingleNodeOptions;
  channelCredentials?: ChannelCredentialOptions;
  defaultUserCredentials?: Credentials;
}
