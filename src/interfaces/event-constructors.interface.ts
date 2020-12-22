import { IEvent } from '@nestjs/cqrs';

export interface IEventConstructors {
  [key: string]: (...args: any[]) => IEvent;
}
