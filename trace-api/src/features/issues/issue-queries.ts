import {prisma} from '../../db/prisma'

export const issueQueries = {

    getBoardViewBySprint: async(sprintId:string) => {
        return prisma.issueBoardProjection.findMany({
            where:{sprintId},
            orderBy: {updatedAt:'desc'}
        })
    },

    getIssuesByWorkspace: async(workspaceId:string, query?:string) => {
        return prisma.issueBoardProjection.findMany({
            where:{
                workspaceId,
                ...(query ? { title: { contains: query, mode: 'insensitive' } } : {})
            },
            orderBy: {updatedAt:'desc'},
            take: 20,
            select: {
                issueId: true,
                title: true,
                status: true,
                sprintId: true
            }
        })
    },

    getByIds: async(issueIds:string[]) => {
        return prisma.issueBoardProjection.findMany({
            where:{issueId:{in:issueIds}},
            select: {
                issueId: true,
                title: true,
                status: true
            }
        })
    },

    getLinks: async(issueId:string) => {
        return prisma.issueActivityProjection.findMany({
            where:{issueId, eventType:'Linked'},
            orderBy: {createdAt:'asc'}
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
    },

}