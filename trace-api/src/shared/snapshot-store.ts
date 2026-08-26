import { IssueState } from "../features/issues/issue-aggregate"
import { Prisma, PrismaClient } from "../generated/prisma/client"
import { prisma } from "../db/prisma"

export class SnapshotStore {
    constructor(private prisma: PrismaClient) {}

    async getLatest(aggregateId: string) {
        return this.prisma.issueSnapshot.findFirst({
            where: { aggregateId },
            orderBy: { version: 'desc' }
        })
    }

    async save(aggregateId: string, version: number, state: IssueState) {
        await this.prisma.issueSnapshot.upsert({
            where: { aggregateId_version: { aggregateId, version } },
            create: {
                aggregateId,
                version,
                state: state as unknown as Prisma.InputJsonValue
            },
            update: {}
        })
    }
}

export const snapshotStore = new SnapshotStore(prisma)
