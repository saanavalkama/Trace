import "dotenv/config";
import app from "./app";
import {env} from "./config/env";
import { startOutboxRelay } from "./shared/outbox-relay";


app.listen(env.port, ()=>{
    console.log(`trace-api listening on ${env.port}`);
})

startOutboxRelay()