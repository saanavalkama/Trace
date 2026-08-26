import {prisma} from '../../db/prisma'

export const issueQueries = {

    getBoardViewBySprint: async(sprintId:string) => {
        return prisma.issueBoardProjection.findMany({
            where:{sprintId},
            orderBy: {updatedAt:'desc'}
        })
    },

    getActivity: async(issueId:string) => {
        return prisma.issueActivityProjection.findMany({
            where:{issueId, eventType:{not:'Commented'}},
            orderBy: {createdAt:'asc'}
        })
    },

    getComments: async(issueId:string) => {
        return prisma.issueActivityProjection.findMany({
            where: {issueId, eventType:'Commented'},
            orderBy:{createdAt:'asc'}        
        })
    },

    getLabels: async(issueId:string) => {
        return prisma.issueActivityProjection.findMany({
            where:{issueId, eventType:'LabelAdded'},
            orderBy: {createdAt:'asc'}
        })
    }
}