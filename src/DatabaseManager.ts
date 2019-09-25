import {Collection, Db, MongoClient} from "mongodb";

export class DatabaseManager {
    private static _instance: DatabaseManager = new DatabaseManager();

    private mongoClient: MongoClient;
    private dragonDatabase: Db;

    private constructor() {
        if (DatabaseManager._instance) {
            throw new Error("Error: instantiation failed: Use DatabaseManager.getInstance() instead of new.");
        }
        DatabaseManager._instance = this;
    }

    public static getInstance(): DatabaseManager {
        return DatabaseManager._instance;
    }

    connect(): Promise<boolean|Error> {
        if (this.mongoClient) {
            return Promise.reject(new Error("mongo client instance already exists"));
        }

        this.mongoClient = new MongoClient();

        return this.mongoClient.connect("mongodb://localhost:27017/Dragon").then((db: Db) => {
            this.dragonDatabase = db;
            return true;
        });
    }

    getCollection(name: string): Promise<Collection|Error> {
        return new Promise((resolve, reject) => {
            if (!this.dragonDatabase) {
                reject(new Error("not connected"));
                return;
            }

            // added strict mode, if collection does not exist throw an error
            this.dragonDatabase.collection(name, {strict: true}, (error: Error, collection: Collection) => {
                if (!collection) {
                    reject(error);
                } else {
                    resolve(collection);
                }
            });
        }).then((result: Collection) => {
            return result;
        }, (error: Error) => {
            return this.dragonDatabase.createCollection(name)
            .then((collection: Collection) => {
                let index: Promise<string>;
                switch (name) {
                    case "doctor":
                        // createIndex on LANR to avoid duplicate LANR (Lifetime Physician Number)
                        index = collection.createIndex({LANR: 1}, {unique: true, background: true});
                        break;
                    case "user":
                        // createIndex on email to avoid duplicate user
                        index = collection.createIndex({email: 1}, {unique: true, background: true});
                        break;
                    case "session":
                        // createIndex with TTL (time to live) so token expire after 3600 second (1 hour)
                        index = collection.createIndex({expire: 1}, {unique: true, background: true, expireAfterSeconds: 3600});
                        break;
                    default:
                        if (!collection) {
                            return Promise.reject(error);
                        }
                        return Promise.resolve(collection);
                }
                return index.then(() => Promise.resolve(collection));
            });
        });
        // ------------------------------------
        /*.catch((error: Error) => {
            // if (error.message === "not connected") {
            //     return Promise.reject(error);
            // }
            // // collection does not seam to exist --> try to create
            // // return this.dragonDatabase.createCollection(name);
        });*/
    }
}
