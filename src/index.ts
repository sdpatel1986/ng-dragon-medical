import {exit} from "process";
import {IncomingMessage, ServerResponse} from "http";

import {DragonServer} from "./DragonServer";
import {DatabaseManager} from "./DatabaseManager";
import {Router} from "./Router";

/**
 *
 * since this server is stateless for achieving scallability:
 *  You could use the cluster mode of pm2 a process manager for NodeJS see: http://pm2.keymetrics.io/docs/usage/cluster-mode/
 *  Or use the cluster library of NodeJS see: https://nodejs.org/api/cluster.html
 *  note that pm2 cluster rely on the cluster library of NodeJS
 *
 * Then if more computationnal power is required you will need to increasing the number of node running your server code.
 *
 * Beside NodeJS server should not be exposed to external traffic thus using Nginx as a reverse proxy is advisable.
 * It enable the use of caching and can also be used as a load balancer between multiple NodeJS server node
 *
 * here is an exemple using the cluser library of NodeJS:

    import * as cluster from "cluster";
    import { cpus } from "os";

    const numCPUs = cpus().length;
    if (cluster.isMaster) {
        console.log(`Master ${process.pid} is running`);

        // Fork workers.
        for (let i = 0; i < numCPUs; i++) {
          cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
          console.log(`worker ${worker.process.pid} died`);
        });
      } else {
        //////////////////////////////
        // start DragonServer Here  //
        //////////////////////////////

        // DragonServer.getInstance()
        // .start((request: IncomingMessage, response: ServerResponse, pathname: string, data: string) => {
        //     Router.getInstance().handle(request, response, pathname, data);
        // })
        // .then()....
        //
        console.log(`Worker ${process.pid} started`);
    }
 */


console.info("=== Starting DragonServer ===");

DragonServer.getInstance()
    .start((request: IncomingMessage, response: ServerResponse, pathname: string, data: string) => {
        Router.getInstance().handle(request, response, pathname, data);
    })

    .then(() => {
        console.log("=== Finished DragonServer start ===");

        return DatabaseManager.getInstance().connect();
    })

    .then(() => {
        console.log("--- Connection to MongoDB established ---");
    })

    .catch((error: Error) => {
        console.error("An error occured during server start", error);
        exit(1); // should probably be changed, see official documentation:
        // If it is necessary to terminate the Node.js process due to an error condition,
        // throwing an uncaught error and allowing the process to terminate accordingly is safer than calling process.exit().
    });
