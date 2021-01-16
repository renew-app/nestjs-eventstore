import { ChannelCredentials } from "@grpc/grpc-js";

declare const RANDOM = "random";
declare const FOLLOWER = "follower";
declare const LEADER = "leader";
declare type NodePreference = typeof RANDOM | typeof FOLLOWER | typeof LEADER;

interface Endpoint {
  address: string;
  port: number;
}

interface ChannelCredentialOptions {
  insecure?: boolean;
  rootCertificate?: Buffer;
  privateKey?: Buffer;
  certChain?: Buffer;
  verifyOptions?: Parameters<typeof ChannelCredentials.createSsl>[3];
};

interface Credentials {
  username: string;
  password: string;
};

interface DnsClusterOptions {
  discover: Endpoint;
  nodePreference?: NodePreference;
};

interface GossipClusterOptions {
  endpoints: Endpoint[];
  nodePreference?: NodePreference;
};

interface SingleNodeOptions {
  endpoint: Endpoint | string;
}

export interface EventStoreConnectionStringOptions {
  connectionString: TemplateStringsArray | string;
  parts: string[];
};

export interface EventStoreDnsClusterOptions {
  connectionSettings: DnsClusterOptions;
  channelCredentials?: ChannelCredentialOptions;
  defaultUserCredentials?: Credentials;
};

export interface EventStoreGossipClusterOptions {
  connectionSettings: GossipClusterOptions;
  channelCredentials?: ChannelCredentialOptions;
  defaultUserCredentials?: Credentials;
};

export interface EventStoreSingleNodeOptions {
  connectionSettings: SingleNodeOptions;
  channelCredentials?: ChannelCredentialOptions;
  defaultUserCredentials?: Credentials;
};
