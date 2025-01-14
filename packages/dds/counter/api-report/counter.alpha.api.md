## Alpha API Report File for "@fluidframework/counter"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import type { ISharedObject } from '@fluidframework/shared-object-base/internal';
import type { ISharedObjectEvents } from '@fluidframework/shared-object-base/internal';
import { ISharedObjectKind } from '@fluidframework/shared-object-base/internal';
import { SharedObjectKind } from '@fluidframework/shared-object-base/internal';

// @alpha
export interface ISharedCounter extends ISharedObject<ISharedCounterEvents> {
    increment(incrementAmount: number): void;
    value: number;
}

// @alpha
export interface ISharedCounterEvents extends ISharedObjectEvents {
    // @eventProperty
    (event: "incremented", listener: (incrementAmount: number, newValue: number) => void): any;
}

// @alpha
export const SharedCounter: ISharedObjectKind<ISharedCounter> & SharedObjectKind<ISharedCounter>;

// @alpha
export type SharedCounter = ISharedCounter;

```
