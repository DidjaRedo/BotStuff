export interface KeyedThing<TN> {
    readonly primaryKey: string;
    readonly keys: TN;
}

