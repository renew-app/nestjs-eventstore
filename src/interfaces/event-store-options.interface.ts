import { Credentials, VerifyOptions } from '@eventstore/db-client';

import { SingleNodeOptions } from '@eventstore/db-client/dist/Client';

export interface EventStoreOptions {
  connectionSettings: SingleNodeOptions;
  insecure?: boolean;
  certChain?: Buffer;
  rootCertificate?: Buffer;
  verifyOptions?: VerifyOptions;
  defaultUserCredentials?: Credentials;
}
