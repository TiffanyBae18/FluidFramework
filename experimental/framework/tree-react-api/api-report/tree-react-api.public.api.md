## Public API Report File for "@fluid-experimental/tree-react-api"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { DataObject } from '@fluidframework/aqueduct/internal';
import type { IFluidDataStoreFactory } from '@fluidframework/runtime-definitions/internal';
import type { IFluidLoadable } from '@fluidframework/core-interfaces';
import type { ImplicitFieldSchema } from '@fluidframework/tree';
import { InsertableTreeFieldFromImplicitField } from '@fluidframework/tree/internal';
import * as React_2 from 'react';
import type { SchemaCompatibilityStatus } from '@fluidframework/tree';
import type { SharedObjectKind } from '@fluidframework/shared-object-base';
import type { TreeFieldFromImplicitField } from '@fluidframework/tree';
import { TreeNode } from '@fluidframework/tree';
import type { TreeView } from '@fluidframework/tree';
import type { TreeViewConfiguration } from '@fluidframework/tree';

// @public
export interface IReactTreeDataObject<TSchema extends ImplicitFieldSchema> extends ITreeDataObject<TSchema> {
    readonly TreeViewComponent: (props: TreeViewProps<TSchema>) => React_2.JSX.Element;
}

// @public
export interface ITreeDataObject<TSchema extends ImplicitFieldSchema> {
    readonly config: TreeViewConfiguration<TSchema>;
    readonly key: string;
    readonly tree: TreeView<TSchema>;
}

// @public
export interface SchemaIncompatibleProps {
    readonly compatibility: SchemaCompatibilityStatus;
    readonly upgradeSchema: () => void;
}

// @public
export function treeDataObject<TSchema extends ImplicitFieldSchema>(key: string, treeConfiguration: TreeViewConfiguration<TSchema>, createInitialTree: () => InsertableTreeFieldFromImplicitField<TSchema>): SharedObjectKind<IReactTreeDataObject<TSchema> & IFluidLoadable>;

// @public
export interface TreeViewProps<TSchema extends ImplicitFieldSchema> {
    readonly errorComponent?: React_2.FC<SchemaIncompatibleProps>;
    readonly viewComponent: React_2.FC<{
        root: TreeFieldFromImplicitField<TSchema>;
    }>;
}

// @public
export function useTree(subtreeRoot: TreeNode): void;

```
