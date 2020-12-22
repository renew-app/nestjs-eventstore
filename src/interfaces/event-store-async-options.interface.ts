export interface EventStoreAsyncOptions {
  useFactory: (...args: any[]) => Promise<any> | any;
  inject?: any[];
}
