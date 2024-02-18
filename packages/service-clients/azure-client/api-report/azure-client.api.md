## API Report File for "@fluidframework/azure-client"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { ContainerSchema } from '@fluidframework/fluid-static';
import { ICompressionStorageConfig } from '@fluidframework/driver-utils';
import { IConfigProviderBase } from '@fluidframework/core-interfaces';
import { IFluidContainer } from '@fluidframework/fluid-static';
import { IMember } from '@fluidframework/fluid-static';
import { IServiceAudience } from '@fluidframework/fluid-static';
import { ITelemetryBaseEvent } from '@fluidframework/core-interfaces';
import { ITelemetryBaseLogger } from '@fluidframework/core-interfaces';
import { ITokenClaims } from '@fluidframework/protocol-definitions';
import { ITokenProvider } from '@fluidframework/routerlicious-driver';
import { ITokenResponse } from '@fluidframework/routerlicious-driver';
import { IUser } from '@fluidframework/protocol-definitions';
import { ScopeType } from '@fluidframework/protocol-definitions';

// @public
export class AzureClient {
    constructor(properties: AzureClientProps);
    copyContainer<TContainerSchema extends ContainerSchema>(id: string, containerSchema: TContainerSchema, version?: AzureContainerVersion): Promise<{
        container: IFluidContainer<TContainerSchema>;
        services: AzureContainerServices;
    }>;
    createContainer<TContainerSchema extends ContainerSchema>(containerSchema: TContainerSchema): Promise<{
        container: IFluidContainer<TContainerSchema>;
        services: AzureContainerServices;
    }>;
    getContainer<TContainerSchema extends ContainerSchema>(id: string, containerSchema: TContainerSchema): Promise<{
        container: IFluidContainer<TContainerSchema>;
        services: AzureContainerServices;
    }>;
    getContainerVersions(id: string, options?: AzureGetVersionsOptions): Promise<AzureContainerVersion[]>;
}

// @public
export interface AzureClientProps {
    readonly configProvider?: IConfigProviderBase;
    readonly connection: AzureRemoteConnectionConfig | AzureLocalConnectionConfig;
    readonly logger?: ITelemetryBaseLogger;
    // (undocumented)
    readonly summaryCompression?: boolean | ICompressionStorageConfig;
}

// @public
export interface AzureConnectionConfig {
    endpoint: string;
    tokenProvider: ITokenProvider;
    type: AzureConnectionConfigType;
}

// @public
export type AzureConnectionConfigType = "local" | "remote";

// @public
export interface AzureContainerServices {
    audience: IAzureAudience;
}

// @public
export interface AzureContainerVersion {
    date?: string;
    id: string;
}

// @internal @deprecated
export class AzureFunctionTokenProvider implements ITokenProvider {
    constructor(azFunctionUrl: string, user?: Pick<AzureMember<any>, "userId" | "userName" | "additionalDetails"> | undefined);
    // (undocumented)
    fetchOrdererToken(tenantId: string, documentId?: string): Promise<ITokenResponse>;
    // (undocumented)
    fetchStorageToken(tenantId: string, documentId: string): Promise<ITokenResponse>;
}

// @public
export interface AzureGetVersionsOptions {
    maxCount: number;
}

// @public
export interface AzureLocalConnectionConfig extends AzureConnectionConfig {
    type: "local";
}

// @public
export interface AzureMember<T = any> extends IMember {
    additionalDetails?: T;
    userName: string;
}

// @public
export interface AzureRemoteConnectionConfig extends AzureConnectionConfig {
    tenantId: string;
    type: "remote";
}

// @internal
export interface AzureUser<T = any> extends IUser {
    additionalDetails?: T;
    name: string;
}

// @public
export type IAzureAudience = IServiceAudience<AzureMember>;

export { ITelemetryBaseEvent }

export { ITelemetryBaseLogger }

export { ITokenClaims }

export { ITokenProvider }

export { ITokenResponse }

export { IUser }

export { ScopeType }

```