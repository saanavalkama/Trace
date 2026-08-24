import {prisma} from '../../db/prisma'

export const issueQueries = {

    getBoardViewBySprint: async(sprintId:string) => {
        return prisma.issueBoardProjection.findMany({
            where:{sprintId},
            orderBy: {updatedAt:'desc'}
        })
    }
}