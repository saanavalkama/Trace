import express from "express";
import {env} from "./config/env";
import { healthRouter } from "./routes/health";

const app = express();

app.use(express.json());

app.use(healthRouter);

app.listen(env.port, ()=>{
    console.log(`trace-api listening on ${env.port}`);
})