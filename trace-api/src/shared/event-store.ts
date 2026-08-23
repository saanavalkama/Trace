import { CURRENT_SCHEMA_VERSION, IssueEvent } from "../features/issues/issue-events";
import { ConcurrencyError } from "../errors/errors";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { prisma } from "../db/prisma";

export class EventStore{
    constructor(private prisma : PrismaClient){}

    async append(
        aggregateId:string, 
        expectedVersion: number,
        event: IssueEvent
    ){
        
        const nextVersion = expectedVersion + 1 

        try{
            return await this.prisma.event.create({
                data: {
                    aggregateId, 
                    version: nextVersion,
                    type: event.type,
                    payload: event.payload as unknown as Prisma.InputJsonValue,
                    schemaVersion: CURRENT_SCHEMA_VERSION[event.type]
                }
            })
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                throw new ConcurrencyError(aggregateId, expectedVersion);
            }
            throw err;
        }
    }

    async getEvents(aggregateId:string){
        return this.prisma.event.findMany({
            where:{aggregateId},
            orderBy: {version:'asc'}
        })
    }
}

export const eventStore = new EventStore(prisma)