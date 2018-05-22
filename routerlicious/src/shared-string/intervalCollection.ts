import { EventEmitter } from "events";
import * as api from "../api-core";
import { IValueFactory, IValueOpEmitter, IValueOperation, IValueType } from "../data-types";
import * as MergeTree from "../merge-tree";
import { SharedString } from "./sharedString";

export interface ISerializedInterval {
    sequenceNumber: number;
    startPosition: number;
    endPosition: number;
    intervalType: MergeTree.IntervalType;
    properties?: MergeTree.PropertySet;
}

export class Interval implements MergeTree.IInterval {
    public properties: MergeTree.PropertySet;
    private checkMergeTree: MergeTree.MergeTree;

    constructor(
        public start: MergeTree.LocalReference,
        public end: MergeTree.LocalReference,
        public intervalType: MergeTree.IntervalType,
        props?: MergeTree.PropertySet) {
        if (props) {
            this.addProperties(props);
        }
    }

    public serialize(client: MergeTree.Client) {
        let startPosition = this.start.toPosition(client.mergeTree,
            client.getCurrentSeq(), client.getClientId());
        let endPosition = this.end.toPosition(client.mergeTree,
            client.getCurrentSeq(), client.getClientId());
        let serializedInterval = <ISerializedInterval> {
            endPosition,
            intervalType: this.intervalType,
            sequenceNumber: client.getCurrentSeq(),
            startPosition,
        };
        if (this.properties) {
            serializedInterval.properties = this.properties;
        }
        return serializedInterval;
    }

    public clone() {
        return new Interval(this.start, this.end, this.intervalType);
    }

    public compare(b: Interval) {
        let startResult = this.start.compare(b.start);
        if (startResult === 0) {
            return (this.end.compare(b.end));
        } else {
            return startResult;
        }
    }

    public overlaps(b: Interval) {
        let result = (this.start.compare(b.end) < 0) &&
            (this.end.compare(b.start) >= 0);
        if (this.checkMergeTree) {
            this.checkOverlaps(b, result);
        }
        return result;
    }

    public union(b: Interval) {
        return new Interval(this.start.min(b.start),
            this.end.max(b.end), this.intervalType);
    }

    public addProperties(newProps: MergeTree.PropertySet, op?: MergeTree.ICombiningOp) {
        this.properties = MergeTree.addProperties(this.properties, newProps, op);
    }

    public overlapsPos(mergeTree: MergeTree.MergeTree, bstart: number, bend: number) {
        let startPos = this.start.toPosition(mergeTree, MergeTree.UniversalSequenceNumber,
            mergeTree.collabWindow.clientId);
        let endPos = this.start.toPosition(mergeTree, MergeTree.UniversalSequenceNumber,
            mergeTree.collabWindow.clientId);
        return (endPos > bstart) && (startPos < bend);
    }

    private checkOverlaps(b: Interval, result: boolean) {
        let astart = this.start.toPosition(this.checkMergeTree, this.checkMergeTree.collabWindow.currentSeq,
            this.checkMergeTree.collabWindow.clientId);
        let bstart = b.start.toPosition(this.checkMergeTree, this.checkMergeTree.collabWindow.currentSeq,
            this.checkMergeTree.collabWindow.clientId);
        let aend = this.end.toPosition(this.checkMergeTree, this.checkMergeTree.collabWindow.currentSeq,
            this.checkMergeTree.collabWindow.clientId);
        let bend = b.end.toPosition(this.checkMergeTree, this.checkMergeTree.collabWindow.currentSeq,
            this.checkMergeTree.collabWindow.clientId);
        let checkResult = ((astart < bend) && (bstart < aend));
        if (checkResult !== result) {
            // tslint:disable-next-line:max-line-length
            console.log(`check mismatch: res ${result} ${this.start.segment === b.end.segment} ${b.start.segment === this.end.segment}`);
            console.log(`as ${astart} ae ${aend} bs ${bstart} be ${bend}`);
            console.log(`as ${MergeTree.ordinalToArray(this.start.segment.ordinal)}@${this.start.offset}`);
            console.log(`ae ${MergeTree.ordinalToArray(this.end.segment.ordinal)}@${this.end.offset}`);
            console.log(`bs ${MergeTree.ordinalToArray(b.start.segment.ordinal)}@${b.start.offset}`);
            console.log(`be ${MergeTree.ordinalToArray(b.end.segment.ordinal)}@${b.end.offset}`);
            console.log(this.checkMergeTree.nodeToString(b.start.segment.parent, ""));
        }

    }
}

export interface IIntervalCollection {
    findOverlappingIntervals(startPosition: number, endPosition: number): Interval[];
    addInterval(start: number, end: number, intervalType: MergeTree.IntervalType,
        props?: MergeTree.PropertySet): Interval;
}

export function createInterval(
    label: string,
    sharedString: SharedString,
    start: number,
    end: number,
    intervalType: MergeTree.IntervalType) {

    let beginRefType = MergeTree.ReferenceType.RangeBegin;
    let endRefType = MergeTree.ReferenceType.RangeEnd;
    if (intervalType === MergeTree.IntervalType.Nest) {
        beginRefType = MergeTree.ReferenceType.NestBegin;
        endRefType = MergeTree.ReferenceType.NestEnd;
    } else if (intervalType === MergeTree.IntervalType.Transient) {
        beginRefType = MergeTree.ReferenceType.Transient;
        endRefType = MergeTree.ReferenceType.Transient;
    }
    let startLref = sharedString.createPositionReference(start, beginRefType);
    let endLref = sharedString.createPositionReference(end, endRefType);
    if (startLref && endLref) {
        startLref.pairedRef = endLref;
        endLref.pairedRef = startLref;
        let rangeProp = {
            [MergeTree.reservedRangeLabelsKey]: [label],
        };
        startLref.addProperties(rangeProp);
        endLref.addProperties(rangeProp);

        let ival = new Interval(startLref, endLref, intervalType, rangeProp);
        // ival.checkMergeTree = sharedString.client.mergeTree;
        return ival;
    }
}

export function endIntervalComparer(a: Interval, b: Interval) {
    return a.end.compare(b.end);
}

export class LocalIntervalCollection implements IIntervalCollection {
    private intervalTree = new MergeTree.IntervalTree<Interval>();
    private endIntervalTree = new MergeTree.RedBlackTree<Interval, Interval>(endIntervalComparer);

    constructor(private sharedString: SharedString, private label: string) {
    }

    public map(fn: (interval: Interval) => void) {
        this.intervalTree.map(fn);
    }

    public findOverlappingIntervals(startPosition: number, endPosition: number) {
        if (!this.intervalTree.intervals.isEmpty()) {
            let transientInterval = createInterval("transient", this.sharedString,
                startPosition, endPosition, MergeTree.IntervalType.Transient);
            let overlappingIntervalNodes = this.intervalTree.match(transientInterval);
            return overlappingIntervalNodes.map((node) => node.key);
        } else {
            return [];
        }
    }

    public previousInterval(pos: number) {
        let transientInterval = createInterval("transient", this.sharedString,
            pos, pos, MergeTree.IntervalType.Transient);
        let rbNode = this.endIntervalTree.floor(transientInterval);
        if (rbNode) {
            return rbNode.data;
        }
    }

    public nextInterval(pos: number) {
        let transientInterval = createInterval("transient", this.sharedString,
            pos, pos, MergeTree.IntervalType.Transient);
        let rbNode = this.endIntervalTree.ceil(transientInterval);
        if (rbNode) {
            return rbNode.data;
        }
    }

    public createInterval(start: number, end: number, intervalType: MergeTree.IntervalType) {
        return createInterval(this.label, this.sharedString, start, end, intervalType);
    }

    // TODO: remove interval, handle duplicate intervals
    public addInterval(
        start: number,
        end: number,
        intervalType: MergeTree.IntervalType,
        props?: MergeTree.PropertySet) {

        let interval = this.createInterval(start, end, intervalType);
        if (interval) {
            interval.addProperties(props);
            interval.properties[MergeTree.reservedRangeLabelsKey] = [this.label];
            this.intervalTree.put(interval);
            this.endIntervalTree.put(interval, interval);
        }
        return interval;
    }

    public serialize() {
        let client = this.sharedString.client;
        let intervals = this.intervalTree.intervals.keys();
        return intervals.map((interval) => interval.serialize(client));
    }
}

export class SharedIntervalCollectionFactory implements IValueFactory<SharedIntervalCollection> {
    public load(emitter: IValueOpEmitter, raw: ISerializedInterval[]): SharedIntervalCollection {
        // The load here does NOT take in some way to process/load the thing.
        // But maybe it wants to to avoid any splits?
        return new SharedIntervalCollection(emitter, raw || []);
    }

    public store(value: SharedIntervalCollection): ISerializedInterval[] {
        return value.serialize();
    }
}

export class SharedIntervalCollectionValueType implements IValueType<SharedIntervalCollection> {
    public static Name = "sharedIntervalCollection";

    public get name(): string {
        return SharedIntervalCollectionValueType.Name;
    }

    public get factory(): IValueFactory<SharedIntervalCollection> {
        return this._factory;
    }

    public get ops(): Map<string, IValueOperation<SharedIntervalCollection>> {
        return this._ops;
    }

    // tslint:disable:variable-name
    private _factory: IValueFactory<SharedIntervalCollection>;
    private _ops: Map<string, IValueOperation<SharedIntervalCollection>>;
    // tslint:enable:variable-name

    constructor() {
        this._factory = new SharedIntervalCollectionFactory();
        this._ops = new Map<string, IValueOperation<SharedIntervalCollection>>(
            [[
                "add",
                {
                    prepare: (value, params, local, op) => {
                        // Local ops were applied when the message was created
                        if (local) {
                            return;
                        }

                        return value.prepareAdd(params, local, op);
                    },
                    process: (value, params, context, local, op) => {
                        // Local ops were applied when the message was created
                        if (local) {
                            return;
                        }

                        value.addSerialized(params, context, local, op);
                    },
                },
            ],
            [
                "remove",
                {
                    prepare: async (value, params, local, op) => {
                        return;
                    },
                    process: (value, params, context, local, op) => {
                        // Local ops were applied when the message was created
                        if (local) {
                            return;
                        }

                        value.remove(params, false);
                    },
                },
            ]]);
    }
}

export class SharedIntervalCollection extends EventEmitter {
    private localCollection: LocalIntervalCollection;
    private sharedString: SharedString;
    private savedSerializedIntervals?: ISerializedInterval[];

    constructor(private emitter: IValueOpEmitter, serializedIntervals: ISerializedInterval[]) {
        super();

        // NOTE: It would be ncie if I could do the initialize stuff at the time of load. Is there a way
        // I can somehow defer access to a SIC until I'm ready to load it?
        //
        // This is loading the SIC from initial data. All the intervals are RAW.
        this.savedSerializedIntervals = serializedIntervals;
    }

    public initialize(sharedString: SharedString, label: string) {
        // NOTE: This isn't called until later on. Until then the local collection is not valid
        if (this.sharedString) {
            return;
        }

        this.sharedString = sharedString;
        this.localCollection = new LocalIntervalCollection(sharedString, label);
        if (this.savedSerializedIntervals) {
            console.log(`WHOOP ${JSON.stringify(this.savedSerializedIntervals)}`);
            for (let serializedInterval of this.savedSerializedIntervals) {
                console.log(`WHOOP ${JSON.stringify(serializedInterval)}`);
                // TODO - I need to run a prepare on this
                this.deserializeInterval(serializedInterval, null);
            }
            this.savedSerializedIntervals = undefined;
        }
    }

    public findOverlappingIntervals(startPosition: number, endPosition: number) {
        return this.localCollection.findOverlappingIntervals(startPosition, endPosition);
    }

    public serialize() {
        // Called when snapshotting to write the thing to disc
        return this.localCollection.serialize();
    }

    public map(fn: (interval: Interval) => void) {
        this.localCollection.map(fn);
    }

    public previousInterval(pos: number): Interval {
        return this.localCollection.previousInterval(pos);
    }

    public nextInterval(pos: number): Interval {
        return this.localCollection.nextInterval(pos);
    }

    public remove(serializedInterval: ISerializedInterval, submitEvent = true) {
        // TODO
    }

    public add(
        startPosition: number,
        endPosition: number,
        intervalType: MergeTree.IntervalType,
        props?: MergeTree.PropertySet) {

        // We are assuming initialize was called first

        let serializedInterval = <ISerializedInterval> {
            endPosition,
            intervalType,
            properties: props,
            sequenceNumber: this.sharedString.client.getCurrentSeq(),
            startPosition,
        };
        this.addSerialized(serializedInterval, null, true, null);
    }

    // TODO: error cases
    public addSerialized(
        serializedInterval: ISerializedInterval,
        context: any,
        local: boolean,
        op: api.ISequencedObjectMessage) {

        // The deserialize interval here may or may not work depending on if we have actually
        // attached a deserializer. In the initial flow we may have not.

        let interval = this.deserializeInterval(serializedInterval, context);
        if (interval) {
            // Null op means this was a local add and we should submit an op to the server
            if (op === null) {
                this.emitter.emit("add", serializedInterval);
            }
        }

        this.emit("addInterval", interval, local, op);

        return this;
    }

    public prepareAdd(
        interval: ISerializedInterval,
        local: boolean,
        message: api.ISequencedObjectMessage): Promise<any> {

        return this.onPrepareDeserialize(interval);
    }

    public on(
        event: "addInterval",
        listener: (interval: ISerializedInterval, local: boolean, op: api.ISequencedObjectMessage) => void): this {
        return super.on(event, listener);
    }

    public onPrepareDeserialize = (value: ISerializedInterval) => Promise.resolve();

    public onDeserialize = (value: Interval, context: any) => { return; };

    private deserializeInterval(serializedInterval: ISerializedInterval, context: any) {
        let interval = this.localCollection.addInterval(
            serializedInterval.startPosition,
            serializedInterval.endPosition,
            serializedInterval.intervalType,
            serializedInterval.properties);
        console.log(`WHOOP this.onDeserialize`);
        this.onDeserialize(interval, context);
        return interval;
    }
}
