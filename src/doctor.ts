import {Collection, InsertWriteOpResult} from "mongodb";

import {DatabaseManager} from "./DatabaseManager";

interface Doctor {
    Name: string;
    "First name": string;
    Adress: string;
    LANR: string;
}

export function getAll(): Promise<Array<Doctor>|Error> {
    return DatabaseManager.getInstance().getCollection("doctor")
        .then((collection: Collection) => {
            return collection.find().toArray();
        });
}

export function getOne(LANR: string): Promise<Array<Doctor>|Error> {
    return DatabaseManager.getInstance().getCollection("doctor")
        .then((collection: Collection) => {
            return collection.find({"LANR": LANR}).toArray();
        });
}

export function writeRecord(records: Doctor[]): Promise<any|Error> {
    return DatabaseManager.getInstance().getCollection("doctor")
        .then((collection: Collection) => {
            return collection.insertMany(records);
        });
}

export function deleteRecord(LANR: string[]): Promise<any|Error> {
    return DatabaseManager.getInstance().getCollection("doctor")
        .then((collection: Collection) => {
            return collection.deleteMany({ "LANR": { $in: LANR } })
            .then((value) => value.result);
        });
}
