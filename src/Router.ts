import {IncomingMessage, ServerResponse} from "http";

import {getAll as getAllDoctor,
        getOne as getOneDoctor,
        writeRecord as writeDoctorRecord,
        deleteRecord as deleteDoctorRecord} from "./doctor";

import {login as userLogin,
        logout as userLogout,
        isLogged as userIsLogged,
        createUser as userCreate} from "./session";

export class Router {
    private static _instance: Router = new Router();

    private constructor() {
        if (Router._instance) {
            throw new Error("Error: instantiation failed: Use Router.getInstance() instead of new.");
        }
        Router._instance = this;
    }

    public static getInstance(): Router {
        return Router._instance;
    }

    handle(request: IncomingMessage, response: ServerResponse, pathname: string, data: string): void {
        let postData: any;

        if (request.method !== "POST" || (pathname !== "/" && pathname !== "")) {
            response.writeHead(501, {"Content-Type": "text/plain"});
            response.end("not implemented yet");

        } else {
            response.setHeader("Content-Type", "application/json");

            try {
                postData = JSON.parse(data);
            } catch (e) {
                let error: Error = e,
                    resultError: any = {
                        error: error.message,
                        errspec: data
                    };

                response.statusCode = 400;
                response.end(JSON.stringify(resultError));
                return;
            }
            Promise.resolve()
                .then(() => {
                    if (postData.class === "doctor") {
                        return userIsLogged(postData.JWT)
                        .then((bool: boolean) => {
                            if (!bool) {
                                return Promise.reject(new Error("you are not an authorized user or your session as expired"));
                            }
                            switch (postData.method) {
                                case "getAll":
                                    return getAllDoctor();
                                case "getOne":
                                    if (postData.LANR && typeof postData.LANR === "string") {
                                        return getOneDoctor(postData.LANR);
                                    }
                                    return Promise.reject(new Error("missing LANR number"));
                                case "writeRecord":
                                    if (Array.isArray(postData.record) && postData.record.length > 0) {
                                        return writeDoctorRecord(postData.record);
                                    }
                                    break;
                                case "deleteRecord":
                                    if (Array.isArray(postData.LANR) && postData.LANR.length > 0) {
                                        return deleteDoctorRecord(postData.LANR);
                                    }
                                    break;
                              }
                        }).then();
                    } else if (postData.class === "session") {
                        switch (postData.method) {
                            case "login":
                                return userLogin(postData.credential);
                            case "logout":
                                return userLogout(postData.JWT);
                            case "createUser":
                                return userCreate(postData.credential);
                        }
                    }

                    return Promise.reject(new Error("request not correctly defined"));
                })
                .then((data: any) => {
                    let result = {
                        success: true
                    };
                    result[postData.class] = data;

                    response.statusCode = 200;
                    response.write(JSON.stringify(result));
                })
                .catch((error: Error) => {
                    let resultError: any = {
                        error: error.message,
                        errspec: data
                    };

                    response.statusCode = 500;
                    response.write(JSON.stringify(resultError));
                })
                .then(() => {
                    response.end();
                });
        }
    }

}
