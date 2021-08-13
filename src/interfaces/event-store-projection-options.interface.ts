export interface EventStoreProjectionConfigurationOptions {
    emitEnabled: boolean;
    trackEmittedStreams: boolean;
    checkpointsEnabled: boolean;
    checkpointAfterMs?: number;
    checkpointHandledThreshold?: number;
    checkpointUnhandledThresholdBytes?; number;
    pendingEventsThreshold?: number;
    maxWriteBatchLength?: number;
    maximumNumberOfAllowedWritesInFlight?: number;
}

export interface EventStoreSystemProjectionOptions extends EventStoreProjectionConfigurationOptions {
    projectionName: '$by_category' | '$by_correlation_id' | '$by_event_type' | '$stream_by_category' | '$streams';
}

export interface EventStoreCustomProjectionOptions extends EventStoreProjectionConfigurationOptions {
    projectionName: string;
    source: string;
    mode: 'One-Time' | 'Continuous',
    enabled: boolean;
}