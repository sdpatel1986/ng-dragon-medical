import {Collection, InsertWriteOpResult, DeleteWriteOpResultObject} from "mongodb";

import {DatabaseManager} from "./DatabaseManager";
import * as crypto from "crypto";

interface CREDENTIAL {
    email: string;
    password: string;
}

/**
 * users info in "users" collection
 * two fields: email: string, password: string // note that for security reason password must be a hash of the user password
 * ex: {"email": "user@email.com", "hashedPassword": "hash"}
 *
 * users signature stored in a "session" collection
 * two fields: expire: date Object, signature: string
 * ex: {"expire": date, "signature": signature }
 *
 * to improve performence signature should be stored in a faster database, redis is a good choice
 *
 * signature is then send as a JWT (json web token) Header.Payload.Signature
*/

const PEPPER = "mypepper"; // should be a strong random string
const SECRET = "mysecret"; // should be a strong random string

/**
 *
 * @param credential
 * take credential as param
 * check if the user exist
 * if so generate a hash of the password and compare it to one stored in database
 * if both hash are equel generate a JWT (json web token)
 * return a JWT or error
 *
 */

export function login(credential: CREDENTIAL) {
    let storedKey: string;
    let salt: string;
    let numOfIteration: string;
    let iteration: number;
    return DatabaseManager.getInstance().getCollection("users")
        .then((collection: Collection) => collection.findOne({"email": credential.email}))
        .then((user: any) => {
            [storedKey, salt, numOfIteration] = user.hashedPassword.split(":");
            iteration = ~~numOfIteration; // ~~"134789" work the same as parseInt("134789") but faster also note that it don't work for number > 2^32
            return generateKey(credential.password, PEPPER, salt, iteration);
        })
        .then((key: string) => {
            if (storedKey === key) {
                return generateToken(credential.email);
            }
            const error: Error = {name: "wrong password", message: "wrong password"};
            throw(error);
        });
}

/**
 *
 * @param credential
 *
 * function used for creating a new user
 *
 */
export function createUser (credential: CREDENTIAL) {
    const salt = crypto.randomBytes(128).toString("hex");
    const iteration = 10000;
    return generateKey(credential.password, PEPPER, salt, iteration)
    .then((derivedKey: string) => {
        return DatabaseManager.getInstance().getCollection("users")
        .then((collection: Collection) => {
            return collection.insertOne({"email": credential.email, "hashedPassword": `${derivedKey}:${salt}:${iteration}`});
        });
    });
}

/**
 *
 * @param password
 * @param pepper
 * @param salt
 * @param iteration
 *
 * generate a salted hash as key for user password
 */
function generateKey(password: string, pepper: string, salt: string, iteration: number): Promise<string> {
    return new Promise((result, reject) => {
        crypto.pbkdf2(password + pepper, salt, iteration, 128, "sha256", (err, derivedKey: Buffer) => {
            err ? reject(err) : result(derivedKey.toString("hex"));
        });
    });
}

/**
 *
 * @param JWT
 * take a JWT (json web token) as param
 * check if the signature of JWT is correct
 *
 */
export function logout(JWT: string): Promise<DeleteWriteOpResultObject|Error> {
    const [header, payload, signature] = JWT.split(".");
    const toCompare = generateSignature(`${header}.${payload}`);
    if (toCompare === signature) {
        return DatabaseManager.getInstance().getCollection("session")
        .then((collection: Collection) => collection.deleteOne({ "signature": signature }));
    } else {
        return Promise.reject(new Error("unauthorized"));
    }
}

/**
 *
 * @param JWT
 * take a JWT (json web token) as param
 * check if the signature of JWT is correct
 * then check if the session of the user is still valide
 *
 * return a boolean or an error
 */
export function isLogged(JWT: string): Promise<Boolean|Error> {
    const [headerB64, payloadB64, signature] = JWT.split(".");
    const toCompare = generateSignature(`${headerB64}.${payloadB64}`);
    if (toCompare === signature) {
        return DatabaseManager.getInstance().getCollection("session")
        .then((collection: Collection) => collection.find({ "signature": signature }).toArray())
        .then((result) => result.length ? true : false);

    } else {
        return Promise.reject(new Error("unauthorized"));
    }
}

/**
 *
 * @param email
 *
 * take the user email as param
 * return a JWT (json web token) or an error
 *
 */
function generateToken(email: string): Promise<String|Error> {
    return new Promise((resolve, reject) => {
        const date = new Date();
        const expire = date.getTime() + 60 * 60 * 1000;
        const header = {alg: "HS256", typ: "JWT"};
        const payload = {iss: "dragon-medical", exp: expire, usr: email};

        const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64");
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");

        const signature = generateSignature(`${encodedHeader}.${encodedPayload}`);

        const JWT = `${encodedHeader}.${encodedPayload}.${signature}`;
        DatabaseManager.getInstance().getCollection("session")
            .then((collection: Collection) => collection.insertOne({"expire": date, "signature": signature }))
            .then(() => resolve(JWT))
            .catch((error: Error) => reject(error));
    });
}

/**
 *
 * @param toHash
 *
 * take a header and a payload encoded in base64
 * return hash serving as signature for JWT
 *
 */

function generateSignature (toHash: string): string {
    const hmac: crypto.Hmac = crypto.createHmac("sha256", SECRET);
    hmac.update(toHash);
    return hmac.digest("hex");
}

